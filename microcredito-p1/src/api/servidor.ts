import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import type { RepositorioPuerto } from "../aplicacion/repositorio-puerto.js";
import { ErrorAplicacion } from "../aplicacion/tipos.js";
import { exigirFechaValida, fechaHoyGuatemala } from "../aplicacion/reloj.js";
import { tasaEfectivaAnual } from "../dominio/tasa-efectiva.js";
import { darDeAltaCliente, solicitarCredito, evaluarSolicitud } from "../aplicacion/servicio-solicitudes.js";
import {
  desembolsarCredito,
  simularPlanAmortizacion,
  consultarCredito,
  consultarDeudaExigible,
  explicarMora,
  consultarPlanAmortizacion,
  listarCreditosEnMora,
  proximosVencimientos,
  listarHistorialDeCobros,
} from "../aplicacion/servicio-creditos.js";
import { registrarPago, previsualizarPago, validarPagoAntesDeAprobar } from "../aplicacion/servicio-pagos.js";
import { emitirTokenAprobacion } from "../aplicacion/aprobaciones-pago.js";
import { consultarCarteraEnRiesgo } from "../aplicacion/servicio-cartera.js";
import { ejecutarCierre } from "../aplicacion/servicio-cierre.js";
import { responderChat } from "../chat/orquestador.js";
import { exigirSesion, actor } from "./autenticacion.js";
import { asesoresDisponibles, iniciarSesion, registrarEnBitacora, registrarUsuario, usuarioPublico } from "../aplicacion/servicio-auth.js";
import {
  creditosVisibles,
  clientesDeAsesor,
  exigirCredito,
  exigirRol,
  exigirSolicitud,
  puedeVerCliente,
  repoDeCartera,
  solicitudesVisibles,
  type Sesion,
} from "../aplicacion/alcance.js";
import { resumenGerencial } from "../aplicacion/servicio-gerencia.js";

/**
 * Fábrica de la app Express (E1). Recibe el repositorio como parámetro
 * (inyección de dependencias) para poder correr:
 *   - en producción, con repositorioPg (PostgreSQL real).
 *   - en desarrollo rápido o en `npm test`, con RepositorioMemoria — así el
 *     equipo puede levantar la interfaz completa sin instalar Postgres
 *     mientras arma la base de datos (ver README, "Modo de desarrollo").
 */
export function crearServidor(repo: RepositorioPuerto): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const asincrono =
    (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
      fn(req, res).catch(next);

  // --- Autenticación (rutas públicas) ---------------------------------------
  app.post(
    "/api/auth/registro",
    asincrono(async (req, res) => {
      res.status(201).json(await registrarUsuario(repo, req.body));
    })
  );
  app.post(
    "/api/auth/login",
    asincrono(async (req, res) => {
      res.json(await iniciarSesion(repo, req.body));
    })
  );
  app.get(
    "/api/auth/asesores-disponibles",
    asincrono(async (_req, res) => {
      res.json(await asesoresDisponibles(repo));
    })
  );

  // Todo lo demás bajo /api exige `Authorization: Bearer <token>` (ver autenticacion.ts).
  app.use("/api", exigirSesion(repo));

  app.get(
    "/api/auth/yo",
    asincrono(async (req, res) => {
      const u = await repo.obtenerUsuario(actor(req).id);
      if (!u) throw new ErrorAplicacion("NO_AUTENTICADO", "Sesión inválida");
      res.json(usuarioPublico(u));
    })
  );

  app.get(
    "/api/mi-perfil",
    asincrono(async (req, res) => {
      const u = await repo.obtenerUsuario(actor(req).id);
      if (!u) throw new ErrorAplicacion("NO_AUTENTICADO", "Sesión inválida");
      res.json({ usuario: usuarioPublico(u), cliente: u.clienteId ? await repo.obtenerCliente(u.clienteId) : null });
    })
  );

  const bitacora = (u: Sesion, accion: string, entidad: string | null, entidadId: string | null, detalle: string | null) =>
    registrarEnBitacora(repo, u, accion, entidad, entidadId, detalle);

  // --- Clientes ------------------------------------------------------------
  app.post(
    "/api/clientes",
    asincrono(async (req, res) => {
      const u = actor(req);
      const body = { ...(req.body ?? {}) };
      if (u.rol === "cliente" && u.clienteId) throw new ErrorAplicacion("VALIDACION", "Tu cuenta ya tiene una ficha de cliente");
      if (typeof body.nombre !== "string" || !body.nombre.trim()) {
        if (u.rol === "cliente") body.nombre = u.nombre;
        else throw new ErrorAplicacion("VALIDACION", "El nombre del cliente es obligatorio");
      }
      if (typeof body.dpi !== "string") throw new ErrorAplicacion("VALIDACION", "El DPI es obligatorio");
      // Sólo gerencia puede fijar el id; si no, un cliente podría "adoptar" la ficha de otro.
      if (u.rol !== "gerencia") delete body.id;
      const cliente = await darDeAltaCliente(repo, {
        ...body,
        fechaAlta: body.fechaAlta ? exigirFechaValida(body.fechaAlta) : fechaCorteDe(req),
        asesorId: u.rol === "asesor" ? u.asesorId : null,
      });
      if (u.rol === "cliente") await repo.vincularClienteAUsuario(u.id, cliente.id);
      await bitacora(u, "Alta de cliente", "cliente", cliente.id, `Cliente ${cliente.nombre} (${cliente.id})`);
      res.json(cliente);
    })
  );

  // Clientes del alcance del usuario (asesor: los suyos; gerencia: todos; cliente: sólo su ficha).
  // El DPI sale enmascarado: sirve para reconocer al cliente, no para copiarlo.
  app.get(
    "/api/clientes",
    asincrono(async (req, res) => {
      const u = actor(req);
      const todos = await repo.listarClientes();
      let visibles = todos;
      if (u.rol === "cliente") visibles = todos.filter((c) => c.id === u.clienteId);
      else if (u.rol === "asesor") {
        const mios = u.asesorId ? await clientesDeAsesor(repo, u.asesorId) : new Set<string>();
        visibles = todos.filter((c) => mios.has(c.id));
      }
      res.json(
        visibles.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          dpiEnmascarado: c.dpi.length > 4 ? `${"•".repeat(c.dpi.length - 4)}${c.dpi.slice(-4)}` : c.dpi,
          telefono: c.telefono,
          municipio: c.municipio,
          direccion: c.direccion,
          fechaAlta: c.fechaAlta,
        }))
      );
    })
  );

  // --- Solicitudes -----------------------------------------------------------
  app.post(
    "/api/solicitudes",
    asincrono(async (req, res) => {
      const u = actor(req);
      const body = { ...(req.body ?? {}) };
      if (u.rol === "cliente") {
        if (!u.clienteId) throw new ErrorAplicacion("VALIDACION", "Primero completa tu ficha de cliente para poder solicitar un crédito");
        body.clienteId = u.clienteId; // un cliente sólo solicita para sí mismo
        delete body.id;
      } else if (typeof body.clienteId !== "string" || !(await puedeVerCliente(repo, u, body.clienteId))) {
        if (typeof body.clienteId === "string" && !(await repo.obtenerCliente(body.clienteId))) {
          throw new ErrorAplicacion("CLIENTE_INEXISTENTE", `No existe el cliente ${body.clienteId}`);
        }
        throw new ErrorAplicacion("SIN_PERMISO", "Ese cliente no está en tu cartera");
      }
      const solicitud = await solicitarCredito(repo, {
        ...body,
        fechaSolicitud: body.fechaSolicitud ? exigirFechaValida(body.fechaSolicitud) : fechaCorteDe(req),
      });
      await bitacora(u, "Solicitud de crédito registrada", "solicitud", solicitud.id, `${solicitud.id} por ${formatearQ(solicitud.montoCentavos)} a ${solicitud.plazoMeses} meses`);
      res.json(solicitud);
    })
  );
  app.get(
    "/api/solicitudes",
    asincrono(async (req, res) => {
      const solicitudes = await solicitudesVisibles(repo, actor(req));
      const creditoPorSolicitud = new Map((await repo.listarCreditos()).filter((c) => c.solicitudId).map((c) => [c.solicitudId as string, c.id]));
      const filas = await Promise.all(
        solicitudes.map(async (s) => {
          const cliente = await repo.obtenerCliente(s.clienteId);
          return {
            id: s.id,
            creditoId: creditoPorSolicitud.get(s.id) ?? null,
            clienteNombre: cliente?.nombre ?? s.clienteId,
            montoSolicitado: { centavos: s.montoCentavos, moneda: "GTQ" },
            plazoMeses: s.plazoMeses,
            estado: s.estado,
            fechaSolicitud: s.fechaSolicitud,
          };
        })
      );
      res.json(filas);
    })
  );

  app.post(
    "/api/solicitudes/:id/evaluar",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "gerencia");
      const decision = req.body?.decision;
      if (decision !== "APRUEBA" && decision !== "RECHAZA") throw new ErrorAplicacion("VALIDACION", "decision debe ser APRUEBA o RECHAZA");
      const solicitud = await evaluarSolicitud(repo, req.params.id, decision, req.body.motivo);
      await bitacora(u, decision === "APRUEBA" ? "Solicitud aprobada" : "Solicitud rechazada", "solicitud", solicitud.id, req.body.motivo ? `Motivo: ${req.body.motivo}` : null);
      res.json(solicitud);
    })
  );

  app.get(
    "/api/solicitudes/:id",
    asincrono(async (req, res) => {
      const s = await exigirSolicitud(repo, actor(req), req.params.id);
      const cliente = await repo.obtenerCliente(s.clienteId);
      const creditoVinculado = (await repo.listarCreditos()).find((c) => c.solicitudId === s.id);
      res.json({
        id: s.id,
        creditoId: creditoVinculado?.id ?? null,
        clienteId: s.clienteId,
        clienteNombre: cliente?.nombre ?? s.clienteId,
        montoSolicitado: { centavos: s.montoCentavos, moneda: "GTQ" },
        plazoMeses: s.plazoMeses,
        estado: s.estado,
        fechaSolicitud: s.fechaSolicitud,
        motivoDecision: s.motivoDecision,
      });
    })
  );

  // Reglas de desembolso: asesor (de su alcance, y asignándose a sí mismo) o gerencia (cualquiera).
  async function autorizarDesembolso(u: Sesion, solicitudId: string, asesorId: unknown) {
    exigirRol(u, "asesor", "gerencia");
    await exigirSolicitud(repo, u, solicitudId);
    if (u.rol === "asesor" && asesorId !== u.asesorId) {
      throw new ErrorAplicacion("SIN_PERMISO", "Sólo puedes desembolsar créditos a tu nombre");
    }
  }
  const bitacoraDesembolso = (u: Sesion, c: { id: string; clienteId: string; capitalCentavos: number }) =>
    bitacora(u, "Crédito desembolsado", "credito", c.id, `${c.id} por ${formatearQ(c.capitalCentavos)} al cliente ${c.clienteId}`);

  // UC4: desembolso de una solicitud APROBADA. El plan que el usuario vio simulado
  // se recalcula igual aquí (mismo servicio); la política de mora la fija la fecha.
  app.post(
    "/api/solicitudes/:id/desembolsar",
    asincrono(async (req, res) => {
      const u = actor(req);
      const { creditoId, asesorId, fechaDesembolso, tnaBps } = req.body ?? {};
      if (typeof asesorId !== "string" || typeof fechaDesembolso !== "string" || !Number.isInteger(tnaBps)) {
        throw new ErrorAplicacion("VALIDACION", "asesorId, fechaDesembolso (AAAA-MM-DD) y tnaBps (entero) son obligatorios");
      }
      await autorizarDesembolso(u, req.params.id, asesorId);
      const asesores = await repo.listarAsesores();
      if (!asesores.some((a) => a.id === asesorId)) throw new ErrorAplicacion("VALIDACION", `El asesor ${asesorId} no existe`);
      if (typeof creditoId === "string" && creditoId && (await repo.obtenerCredito(creditoId))) {
        throw new ErrorAplicacion("VALIDACION", `Ya existe el crédito ${creditoId}`);
      }
      const credito = await desembolsarCredito(repo, req.params.id, {
        ...(typeof creditoId === "string" && creditoId ? { creditoId } : {}),
        asesorId,
        fechaDesembolso,
        tnaBps,
      });
      await bitacoraDesembolso(u, credito);
      res.json(credito);
    })
  );

  // Política de crédito vigente: rango y tasa por defecto SUGERIDA (editable por solicitud).
  app.get(
    "/api/politica-credito",
    asincrono(async (req, res) => {
      const p = await repo.politicaCreditoVigenteEn(fechaCorteDe(req));
      res.json({ ...p, teaDefecto: tasaEfectivaAnual(p.tnaDefectoBps) });
    })
  );

  app.get(
    "/api/asesores",
    asincrono(async (req, res) => {
      exigirRol(actor(req), "asesor", "gerencia");
      res.json(await repo.listarAsesores());
    })
  );

  // --- Plan simulado (antes de desembolsar) ---------------------------------
  app.post(
    "/api/plan-simulado",
    asincrono(async (req, res) => {
      const { capitalCentavos, tnaBps, plazoMeses } = req.body;
      const pc = await repo.politicaCreditoVigenteEn(fechaCorteDe(req));
      if (tnaBps < pc.tnaMinBps || tnaBps > pc.tnaMaxBps) {
        throw new ErrorAplicacion("VALIDACION", `La tasa debe estar entre ${pc.tnaMinBps / 100} % y ${pc.tnaMaxBps / 100} % (política ${pc.id})`);
      }
      const plan = simularPlanAmortizacion(capitalCentavos, tnaBps, plazoMeses);
      res.json({
        tea: tasaEfectivaAnual(tnaBps),
        filas: plan.filas.map((f) => ({
          numeroCuota: f.numeroCuota,
          cuota: { centavos: f.cuota.centavos, moneda: f.cuota.moneda },
          capital: { centavos: f.amortizacion.centavos, moneda: f.amortizacion.moneda },
          interes: { centavos: f.interes.centavos, moneda: f.interes.moneda },
        })),
      });
    })
  );

  // --- Créditos --------------------------------------------------------------
  app.post(
    "/api/creditos/:solicitudId/desembolsar",
    asincrono(async (req, res) => {
      const u = actor(req);
      const body = { ...(req.body ?? {}) };
      if (u.rol === "asesor" && body.asesorId === undefined) body.asesorId = u.asesorId;
      await autorizarDesembolso(u, req.params.solicitudId, body.asesorId);
      const credito = await desembolsarCredito(repo, req.params.solicitudId, body);
      await bitacoraDesembolso(u, credito);
      res.json(credito);
    })
  );

  app.get(
    "/api/creditos",
    asincrono(async (req, res) => {
      const hoy = fechaCorteDe(req);
      const creditos = await creditosVisibles(repo, actor(req));
      const nombresAsesor = new Map((await repo.listarAsesores()).map((a) => [a.id, a.nombre]));
      const filas = await Promise.all(
        creditos.map(async (c) => {
          const detalle = await consultarCredito(repo, c.id, hoy);
          const cliente = await repo.obtenerCliente(c.clienteId);
          return {
            id: c.id,
            clienteNombre: cliente?.nombre ?? c.clienteId,
            asesorNombre: c.asesorId ? (nombresAsesor.get(c.asesorId) ?? c.asesorId) : null,
            estado: detalle.estado,
            tramo: detalle.tramo,
            saldoCapital: detalle.saldoCapital,
            diasDeAtraso: detalle.diasDeAtraso,
          };
        })
      );
      res.json(filas);
    })
  );

  app.get(
    "/api/creditos/:id",
    asincrono(async (req, res) => {
      await exigirCredito(repo, actor(req), req.params.id);
      const fechaCorte = fechaCorteDe(req);
      res.json(await consultarCredito(repo, req.params.id, fechaCorte));
    })
  );

  app.get(
    "/api/creditos/:id/deuda-exigible",
    asincrono(async (req, res) => {
      await exigirCredito(repo, actor(req), req.params.id);
      res.json(await consultarDeudaExigible(repo, req.params.id, fechaCorteDe(req)));
    })
  );

  app.get(
    "/api/creditos/:id/mora",
    asincrono(async (req, res) => {
      await exigirCredito(repo, actor(req), req.params.id);
      const cuota = req.query["cuota"] ? Number(req.query["cuota"]) : undefined;
      res.json(await explicarMora(repo, req.params.id, fechaCorteDe(req), cuota));
    })
  );

  app.get(
    "/api/creditos/:id/plan",
    asincrono(async (req, res) => {
      await exigirCredito(repo, actor(req), req.params.id);
      res.json(await consultarPlanAmortizacion(repo, req.params.id, fechaCorteDe(req)));
    })
  );

  app.get(
    "/api/creditos/:id/pagos",
    asincrono(async (req, res) => {
      await exigirCredito(repo, actor(req), req.params.id);
      res.json(await listarHistorialDeCobros(repo, req.params.id));
    })
  );

  app.get(
    "/api/creditos-en-mora",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "asesor", "gerencia");
      res.json(await listarCreditosEnMora(await repoDeCartera(repo, u), fechaCorteDe(req), req.query.tramo as string | undefined));
    })
  );

  app.get(
    "/api/vencimientos",
    asincrono(async (req, res) => {
      const ventana = Number(req.query.dias ?? 7);
      res.json(await proximosVencimientos(await repoDeCartera(repo, actor(req)), fechaCorteDe(req), ventana));
    })
  );

  // --- Pagos -------------------------------------------------------------------
  app.get(
    "/api/pagos/previsualizar/:creditoId",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "asesor", "gerencia");
      await exigirCredito(repo, u, req.params.creditoId);
      res.json(await previsualizarPago(repo, req.params.creditoId, fechaCorteDe(req)));
    })
  );

  // Emite el token de aprobación humana. Llamarlo NO registra ningún pago
  // — solo lo hace la propia interfaz (HojaAprobacionPago.tsx / la
  // tarjeta de aprobación del chat), en el instante exacto en que la
  // persona toca "Aprobar". No existe ninguna herramienta MCP equivalente
  // a esta ruta: un modelo de lenguaje no tiene forma de llamarla por su
  // cuenta, así que tampoco tiene forma de fabricarse su propia
  // aprobación (ver src/aplicacion/aprobaciones-pago.ts).
  // Validación previa sin emitir token: la pantalla la llama al tocar "Aceptar" para rechazar
  // (monto no exacto / incobrable / sin cuotas) ANTES de mostrar la hoja de aprobación humana.
  app.post(
    "/api/pagos/validar",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "asesor", "gerencia");
      const { creditoId, montoCentavos, claveIdempotencia } = req.body ?? {};
      if (typeof creditoId !== "string" || !Number.isInteger(montoCentavos) || typeof claveIdempotencia !== "string" || !claveIdempotencia) {
        throw new ErrorAplicacion("VALIDACION", "creditoId, montoCentavos (entero) y claveIdempotencia son obligatorios");
      }
      await exigirCredito(repo, u, creditoId);
      const fecha = typeof req.body.fecha === "string" ? req.body.fecha : fechaCorteDe(req);
      res.json(await validarPagoAntesDeAprobar(repo, { creditoId, montoCentavos, claveIdempotencia, fecha }));
    })
  );

  app.post(
    "/api/pagos/solicitar-aprobacion",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "asesor", "gerencia");
      const { creditoId, montoCentavos, claveIdempotencia } = req.body ?? {};
      if (typeof creditoId !== "string" || !Number.isInteger(montoCentavos) || typeof claveIdempotencia !== "string" || !claveIdempotencia) {
        throw new ErrorAplicacion("VALIDACION", "creditoId, montoCentavos (entero) y claveIdempotencia son obligatorios");
      }
      await exigirCredito(repo, u, creditoId);
      const fecha = typeof req.body.fecha === "string" ? req.body.fecha : fechaCorteDe(req);
      const { yaAplicado } = await validarPagoAntesDeAprobar(repo, { creditoId, montoCentavos, claveIdempotencia, fecha });
      if (yaAplicado) return res.json({ yaAplicado: true, tokenAprobacion: null });
      const token = emitirTokenAprobacion({ creditoId, montoCentavos, claveIdempotencia });
      res.json({ yaAplicado: false, tokenAprobacion: token, expiraEnSegundos: 300 });
    })
  );

  app.post(
    "/api/pagos",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "asesor", "gerencia");
      const credito = await exigirCredito(repo, u, String(req.body?.creditoId ?? ""));
      const resultado = await registrarPago(repo, req.body);
      if (!resultado.yaAplicado) {
        await bitacora(u, "Pago registrado", "credito", credito.id, `${formatearQ(Number(req.body.montoCentavos))} al crédito ${credito.id} (${req.body.fecha})`);
      }
      res.json(resultado);
    })
  );

  // --- Cartera y cierres ---------------------------------------------------
  app.get(
    "/api/cartera/en-riesgo",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "asesor", "gerencia");
      res.json(await consultarCarteraEnRiesgo(await repoDeCartera(repo, u), fechaCorteDe(req)));
    })
  );

  app.post(
    "/api/cierres/diario",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "gerencia");
      const cierre = await ejecutarCierre(repo, "DIARIO", req.body?.fechaCorte ?? fechaCorteDe(req));
      await bitacora(u, "Cierre diario ejecutado", "cierre", cierre.fechaCorte, `Cierre diario al ${cierre.fechaCorte}`);
      res.json(cierre);
    })
  );
  app.post(
    "/api/cierres/mensual",
    asincrono(async (req, res) => {
      const u = actor(req);
      exigirRol(u, "gerencia");
      const cierre = await ejecutarCierre(repo, "MENSUAL", req.body?.fechaCorte ?? fechaCorteDe(req));
      await bitacora(u, "Cierre mensual ejecutado", "cierre", cierre.fechaCorte, `Cierre mensual al ${cierre.fechaCorte}`);
      res.json(cierre);
    })
  );

  // --- Chat gerencial (E5) ---------------------------------------------------
  app.post(
    "/api/chat",
    asincrono(async (req, res) => {
      exigirRol(actor(req), "gerencia");
      res.json(await responderChat(repo, req.body.historial, req.body?.fechaCorte ? exigirFechaValida(req.body.fechaCorte) : fechaCorteDe(req)));
    })
  );

  // --- Analítica gerencial (sólo gerencia) ---------------------------------
  app.get(
    "/api/gerencia/resumen",
    asincrono(async (req, res) => {
      exigirRol(actor(req), "gerencia");
      res.json(await resumenGerencial(repo, fechaCorteDe(req)));
    })
  );
  app.get(
    "/api/gerencia/bitacora",
    asincrono(async (req, res) => {
      exigirRol(actor(req), "gerencia");
      const limite = Math.min(Math.max(Number.parseInt(String(req.query.limite ?? "50"), 10) || 50, 1), 500);
      const filas = await repo.listarBitacora(limite);
      res.json(filas.map((b) => ({ id: b.id, fecha: b.fecha, usuarioNombre: b.usuarioNombre, rol: b.rol, accion: b.accion, detalle: b.detalle })));
    })
  );
  app.get(
    "/api/gerencia/usuarios",
    asincrono(async (req, res) => {
      exigirRol(actor(req), "gerencia");
      const filas = await repo.listarUsuarios();
      res.json(filas.map((x) => ({ id: x.id, nombre: x.nombre, identificador: x.identificador, rol: x.rol, creadoEn: x.creadoEn, ultimoAcceso: x.ultimoAcceso })));
    })
  );

  app.get("/api/salud", (_req, res) => res.json({ ok: true }));

  // Manejador de errores uniforme (E3: "convención uniforme de errores").
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ErrorAplicacion) {
      const status = STATUS_POR_CODIGO[err.codigo] ?? 400;
      res.status(status).json({ codigo: err.codigo, mensaje: err.message, detalles: err.detalles });
      return;
    }
    // JSON mal formado u otros errores 4xx del parser de express.
    const estadoHttp = (err as { status?: number } | null)?.status;
    if (typeof estadoHttp === "number" && estadoHttp >= 400 && estadoHttp < 500) {
      res.status(estadoHttp).json({ codigo: "VALIDACION", mensaje: "Petición inválida (¿JSON mal formado?)" });
      return;
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" });
  });

  return app;
}

const STATUS_POR_CODIGO: Record<string, number> = {
  CREDITO_INEXISTENTE: 404,
  CLIENTE_INEXISTENTE: 404,
  SOLICITUD_INEXISTENTE: 404,
  NO_AUTENTICADO: 401,
  CREDENCIALES_INVALIDAS: 401,
  SIN_PERMISO: 403,
  IDENTIFICADOR_DUPLICADO: 409,
};

function formatearQ(centavos: number): string {
  return `Q${(centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Fecha de operación de la petición: `?fechaCorte=` si viene; si no, CV_FECHA_OPERACION (opcional,
 * para ensayos/video) y, a falta de ambas, la fecha de HOY en Guatemala (UTC-6). Nunca una constante.
 */
function fechaCorteDe(req: Request): string {
  const valor =
    typeof req.query.fechaCorte === "string" && req.query.fechaCorte
      ? req.query.fechaCorte
      : (process.env["CV_FECHA_OPERACION"] || fechaHoyGuatemala());
  return exigirFechaValida(valor);
}
