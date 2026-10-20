import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alerta from "../componentes/Alerta";
import Campo from "../componentes/Campo";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useSesion } from "../contexto/SesionContext";
import { useToast } from "../contexto/ToastContext";
import { api, ErrorApi, mensajeError } from "../lib/api";
import { aCentavos, formatearDinero, quetzales } from "../lib/dinero";
import type { Cliente, ClienteResumen, FilaPlanSimulado, MiPerfil, PoliticaCredito } from "../lib/tipos";

type Paso = "datos" | "credito" | "revision";

interface DatosCliente {
  nombre: string;
  dpi: string;
  telefono: string;
  municipio: string;
  direccion: string;
}

interface Simulacion {
  cuota: string;
  tea: string;
  cuotas: number;
}

// Límites que valida el servidor (servicio-solicitudes.ts); se usan los de la política si vienen.
const MONTO_MIN = 100_000;
const MONTO_MAX = 2_500_000;
const PLAZO_MIN = 3;
const PLAZO_MAX = 24;

/**
 * Solicitud de crédito.
 *  - Cliente con ficha: sólo monto y plazo (sus datos ya están guardados).
 *  - Cliente nuevo: primero su ficha (DPI, teléfono, municipio, dirección), luego monto y plazo.
 *  - Asesor: datos del cliente (queda en su cartera), luego monto y plazo.
 * El plan se simula en el servidor antes de enviar; ninguna cifra financiera se calcula aquí.
 */
export default function SolicitudCredito() {
  const navegar = useNavigate();
  const toast = useToast();
  const { usuario, refrescar } = useSesion();
  const { fecha, conFecha } = useFechaOperacion();
  const esAsesor = usuario?.rol === "asesor";
  const tieneFicha = !esAsesor && !!usuario?.clienteId;
  const pasos: Paso[] = tieneFicha ? ["credito", "revision"] : ["datos", "credito", "revision"];

  const [paso, setPaso] = useState<Paso>(pasos[0]!);
  const [datos, setDatos] = useState<DatosCliente>({ nombre: "", dpi: "", telefono: "", municipio: "", direccion: "" });
  const [monto, setMonto] = useState("");
  const [plazo, setPlazo] = useState("12");
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [politica, setPolitica] = useState<PoliticaCredito | null>(null);
  const [ficha, setFicha] = useState<Cliente | null>(null);
  const [simulacion, setSimulacion] = useState<Simulacion | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Si el cliente se creó pero la solicitud falló, el reintento no vuelve a crear la ficha.
  const [clienteCreadoId, setClienteCreadoId] = useState<string | null>(null);
  // Asesor: puede elegir un cliente que ya tiene en su cartera en vez de volver a capturar sus datos.
  const [misClientes, setMisClientes] = useState<ClienteResumen[]>([]);
  const [clienteExistenteId, setClienteExistenteId] = useState("");
  const clienteExistente = misClientes.find((c) => c.id === clienteExistenteId) ?? null;

  useEffect(() => {
    if (!esAsesor) return;
    api.get<ClienteResumen[]>("/clientes").then(setMisClientes).catch(() => undefined);
  }, [esAsesor]);

  useEffect(() => {
    api.get<PoliticaCredito>(conFecha("/politica-credito")).then(setPolitica).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  useEffect(() => {
    if (!tieneFicha) return;
    api.get<MiPerfil>("/mi-perfil").then((p) => setFicha(p.cliente)).catch(() => undefined);
  }, [tieneFicha]);

  const montoMin = politica?.montoMinCentavos ?? MONTO_MIN;
  const montoMax = politica?.montoMaxCentavos ?? MONTO_MAX;
  const plazoMin = politica?.plazoMinMeses ?? PLAZO_MIN;
  const plazoMax = politica?.plazoMaxMeses ?? PLAZO_MAX;

  const montoCentavos = aCentavos(monto);
  const plazoMeses = /^\d+$/.test(plazo.trim()) ? Number(plazo.trim()) : null;

  const errores = useMemo(() => {
    const e: Record<string, string | null> = {};
    const usaExistente = esAsesor && !!clienteExistenteId;
    e["nombre"] = esAsesor && !usaExistente && datos.nombre.trim().length < 2 ? "Escribe el nombre completo del cliente." : null;
    e["dpi"] = usaExistente ? null : !/^[A-Za-z0-9-]{8,20}$/.test(datos.dpi.trim()) ? "El DPI debe tener entre 8 y 20 caracteres (13 dígitos en un DPI real)." : null;
    e["telefono"] = usaExistente ? null : datos.telefono.replace(/\D/g, "").length < 8 ? "Escribe un teléfono de al menos 8 dígitos." : null;
    e["municipio"] = usaExistente ? null : !datos.municipio.trim() ? "Escribe el municipio." : null;
    e["monto"] =
      montoCentavos === null
        ? "Escribe un monto válido, por ejemplo 5000 o 5000.50."
        : montoCentavos < montoMin || montoCentavos > montoMax
          ? `El monto debe estar entre ${quetzales(montoMin)} y ${quetzales(montoMax)}.`
          : null;
    e["plazo"] = plazoMeses === null || plazoMeses < plazoMin || plazoMeses > plazoMax ? `El plazo debe ser de ${plazoMin} a ${plazoMax} meses.` : null;
    return e;
  }, [datos, clienteExistenteId, montoCentavos, plazoMeses, esAsesor, montoMin, montoMax, plazoMin, plazoMax]);

  const ver = (k: string) => (tocado[k] ? errores[k] : null);
  const tocar = (...k: string[]) => setTocado((t) => ({ ...t, ...Object.fromEntries(k.map((x) => [x, true])) }));
  const indice = pasos.indexOf(paso);

  function continuarDatos() {
    tocar("nombre", "dpi", "telefono", "municipio");
    if (errores["nombre"] || errores["dpi"] || errores["telefono"] || errores["municipio"]) return;
    setError(null);
    setPaso("credito");
  }

  async function simular() {
    tocar("monto", "plazo");
    if (errores["monto"] || errores["plazo"] || montoCentavos === null || plazoMeses === null) return;
    setError(null);
    setSimulando(true);
    try {
      const tnaBps = politica?.tnaDefectoBps ?? 3600;
      const plan = await api.post<{ tea: number; filas: FilaPlanSimulado[] }>(conFecha("/plan-simulado"), { capitalCentavos: montoCentavos, tnaBps, plazoMeses });
      setSimulacion({ cuota: formatearDinero(plan.filas[0]?.cuota), tea: `${(plan.tea * 100).toFixed(2)} %`, cuotas: plan.filas.length });
      setPaso("revision");
    } catch (e) {
      setError(mensajeError(e, "No se pudo calcular tu cuota. Inténtalo de nuevo."));
    } finally {
      setSimulando(false);
    }
  }

  async function enviar() {
    if (montoCentavos === null || plazoMeses === null) return;
    setEnviando(true);
    setError(null);
    try {
      let clienteId = clienteCreadoId ?? (clienteExistenteId || null);
      if (!tieneFicha && !clienteId) {
        const creado = await api.post<Cliente>("/clientes", {
          ...(esAsesor ? { nombre: datos.nombre.trim() } : {}),
          dpi: datos.dpi.trim(),
          telefono: datos.telefono.trim(),
          municipio: datos.municipio.trim(),
          ...(datos.direccion.trim() ? { direccion: datos.direccion.trim() } : {}),
        });
        clienteId = creado.id;
        setClienteCreadoId(creado.id);
        if (!esAsesor) await refrescar(); // la cuenta del cliente queda vinculada a su ficha
      }
      const solicitud = await api.post<{ id: string }>("/solicitudes", {
        ...(esAsesor ? { clienteId } : {}),
        montoCentavos,
        plazoMeses,
      });
      toast.mostrar("Solicitud enviada. Quedó en revisión.");
      navegar(`/solicitud/${solicitud.id}`, { replace: true });
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.codigo === "VALIDACION" && /DPI/.test(e.message)
          ? `${e.message}${esAsesor ? "" : " Si ya eres cliente, verifica que tu DPI sea el correcto."}`
          : mensajeError(e, "No se pudo enviar la solicitud.")
      );
    } finally {
      setEnviando(false);
    }
  }

  function atras() {
    setError(null);
    const anterior = pasos[indice - 1];
    if (anterior) setPaso(anterior);
  }

  return (
    <div>
      <EncabezadoPantalla titulo={esAsesor ? "Solicitud para un cliente" : "Solicitar un crédito"} conRegreso volverA="/menu" />
      <div className="flex gap-1 px-4 pt-3" role="progressbar" aria-valuemin={1} aria-valuemax={pasos.length} aria-valuenow={indice + 1} aria-label="Avance de la solicitud">
        {pasos.map((p, i) => (
          <div key={p} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= indice ? "bg-verde" : "bg-linea"}`} />
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
        <p className="etiqueta">
          Paso {indice + 1} de {pasos.length} · {paso === "datos" ? (esAsesor ? "Datos del cliente" : "Tus datos") : paso === "credito" ? "Monto y plazo" : "Revisa y envía"}
        </p>
        {error && <Alerta>{error}</Alerta>}

        {paso === "datos" && (
          <div className="flex flex-col gap-4">
            {!esAsesor && <Alerta tono="info">Es tu primera solicitud: guardamos estos datos una sola vez y no te los volveremos a pedir.</Alerta>}
            {esAsesor && misClientes.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Cliente</span>
                <select className="campo" value={clienteExistenteId} onChange={(e) => setClienteExistenteId(e.target.value)}>
                  <option value="">Cliente nuevo (capturar datos)</option>
                  {misClientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} · {c.dpiEnmascarado}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {esAsesor && !clienteExistenteId && <Campo etiqueta="Nombre completo del cliente" valor={datos.nombre} onCambio={(v) => setDatos({ ...datos, nombre: v })} onBlur={() => tocar("nombre")} error={ver("nombre")} autoComplete="off" />}
            {!clienteExistenteId && (<>
            <Campo etiqueta="DPI" valor={datos.dpi} onCambio={(v) => setDatos({ ...datos, dpi: v })} onBlur={() => tocar("dpi")} error={ver("dpi")} inputMode="numeric" autoComplete="off" />
            <Campo etiqueta="Teléfono" valor={datos.telefono} onCambio={(v) => setDatos({ ...datos, telefono: v })} onBlur={() => tocar("telefono")} error={ver("telefono")} inputMode="tel" autoComplete="tel" />
            <Campo etiqueta="Municipio" valor={datos.municipio} onCambio={(v) => setDatos({ ...datos, municipio: v })} onBlur={() => tocar("municipio")} error={ver("municipio")} />
            <Campo etiqueta="Dirección" valor={datos.direccion} onCambio={(v) => setDatos({ ...datos, direccion: v })} opcional />
            </>)}
          </div>
        )}

        {paso === "credito" && (
          <div className="flex flex-col gap-4">
            <Campo etiqueta="¿Cuánto necesitas? (Q)" valor={monto} onCambio={setMonto} onBlur={() => tocar("monto")} error={ver("monto")} ayuda={`Entre ${quetzales(montoMin)} y ${quetzales(montoMax)}.`} inputMode="decimal" autoFocus />
            <Campo etiqueta="Plazo (meses)" valor={plazo} onCambio={setPlazo} onBlur={() => tocar("plazo")} error={ver("plazo")} ayuda={`De ${plazoMin} a ${plazoMax} meses.`} inputMode="numeric" />
          </div>
        )}

        {paso === "revision" && simulacion && montoCentavos !== null && (
          <div className="flex flex-col gap-4">
            <div className="tarjeta flex flex-col gap-3">
              <Fila etiqueta={esAsesor ? "Cliente" : "Solicitante"} valor={esAsesor ? clienteExistente?.nombre ?? datos.nombre.trim() : usuario?.nombre ?? ""} />
              {!tieneFicha && !clienteExistente && <Fila etiqueta="DPI" valor={datos.dpi.trim()} />}
              {clienteExistente && <Fila etiqueta="DPI" valor={clienteExistente.dpiEnmascarado} />}
              {tieneFicha && ficha && <Fila etiqueta="DPI" valor={`•••• ${ficha.dpi.slice(-4)}`} />}
              <Fila etiqueta="Monto" valor={quetzales(montoCentavos)} />
              <Fila etiqueta="Plazo" valor={`${plazo.trim()} meses`} />
              <Fila etiqueta="Cuota mensual estimada" valor={simulacion.cuota} destacado />
              <Fila etiqueta="Tasa efectiva anual" valor={simulacion.tea} />
            </div>
            <p className="text-xs text-tinta/60">La cuota es una estimación. La tasa final la confirma el comité al desembolsar.</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-linea bg-white/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        {indice > 0 && (
          <button className="boton-secundario !px-4" onClick={atras} disabled={enviando || simulando}>
            Atrás
          </button>
        )}
        {paso === "datos" && (
          <button className="boton-primario flex-1" onClick={continuarDatos}>
            Continuar
          </button>
        )}
        {paso === "credito" && (
          <button className="boton-primario flex-1" onClick={simular} disabled={simulando}>
            {simulando ? "Calculando…" : "Ver mi cuota"}
          </button>
        )}
        {paso === "revision" && (
          <button className="boton-cta flex-1" onClick={enviar} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </button>
        )}
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-tinta/60">{etiqueta}</span>
      <span className={`cifra text-right text-sm ${destacado ? "text-base font-semibold text-verde-oscuro" : "font-medium"}`}>{valor}</span>
    </div>
  );
}
