import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alerta from "../componentes/Alerta";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import { EsqueletoLista } from "../componentes/Esqueleto";
import HojaAprobacionPago from "../componentes/HojaAprobacionPago";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useToast } from "../contexto/ToastContext";
import { api, ErrorApi, mensajeError } from "../lib/api";
import { aCentavos, formatearDinero, formatearFecha, quetzales } from "../lib/dinero";
import type { CreditoDetalle, HistorialCobros, PrevisualizacionPago, ResultadoPago } from "../lib/tipos";
import { useBase } from "../lib/rutas";

function generarClave(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Estado =
  | { tipo: "cargando" }
  | { tipo: "sin_pendientes" }
  | { tipo: "listo"; previsualizacion: PrevisualizacionPago }
  | { tipo: "error_carga"; mensaje: string }
  | { tipo: "confirmado"; resultado: ResultadoPago };

/**
 * Registrar un pago (asesor y gerencia). Flujo con aprobación humana: validar monto en el servidor,
 * mostrar el desglose, y sólo al tocar "Aprobar y cobrar" se pide el token de un solo uso y se registra.
 */
export default function RegistroPago() {
  const base = useBase();
  const { id = "" } = useParams<{ id: string }>();
  const toast = useToast();
  const { fecha, conFecha } = useFechaOperacion();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [credito, setCredito] = useState<CreditoDetalle | null>(null);
  const [historial, setHistorial] = useState<HistorialCobros | null>(null);
  const [montoTexto, setMontoTexto] = useState("");
  const [errorMonto, setErrorMonto] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<{ titulo: string; texto: string } | null>(null);
  const [mostrarAprobacion, setMostrarAprobacion] = useState(false);
  const [validando, setValidando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [montoAprobado, setMontoAprobado] = useState<number | null>(null);
  // La clave de idempotencia vive mientras dura esta pantalla: un doble toque nunca cobra dos veces.
  const [clave] = useState(generarClave);

  const cargar = useCallback(() => {
    setEstado({ tipo: "cargando" });
    Promise.all([api.get<CreditoDetalle>(conFecha(`/creditos/${id}`)), api.get<HistorialCobros>(`/creditos/${id}/pagos`)])
      .then(([c, h]) => {
        setCredito(c);
        setHistorial(h);
      })
      .catch(() => undefined);
    api
      .get<PrevisualizacionPago>(conFecha(`/pagos/previsualizar/${id}`))
      .then((p) => {
        setEstado({ tipo: "listo", previsualizacion: p });
        setMontoTexto((actual) => actual || (p.montoExigibleCentavos / 100).toFixed(2));
      })
      .catch((e) => {
        if (e instanceof ErrorApi && e.codigo === "CUOTA_YA_PAGADA") setEstado({ tipo: "sin_pendientes" });
        else setEstado({ tipo: "error_carga", mensaje: mensajeError(e) });
      });
    // conFecha cambia sólo con la fecha
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fecha]);

  useEffect(cargar, [cargar]);

  function mostrarErrorApi(e: unknown) {
    if (e instanceof ErrorApi && e.codigo === "MONTO_NO_EXACTO") {
      const correcto = Number(e.detalles?.["montoCorrectoCentavos"] ?? 0);
      setErrorMonto(`El monto no coincide. El monto exacto a cobrar es ${quetzales(correcto)}.`);
      setMontoTexto((correcto / 100).toFixed(2));
    } else if (e instanceof ErrorApi && e.codigo === "CREDITO_INCOBRABLE") {
      setErrorGeneral({ titulo: "Crédito incobrable", texto: e.message });
    } else {
      setErrorGeneral({ titulo: "No se pudo procesar el cobro", texto: mensajeError(e) });
    }
  }

  /** Paso 1: el servidor valida el monto ANTES de mostrar la hoja de aprobación. */
  async function aceptar() {
    if (estado.tipo !== "listo") return;
    setErrorMonto(null);
    setErrorGeneral(null);
    const centavos = aCentavos(montoTexto);
    if (centavos === null || centavos <= 0) {
      setErrorMonto("Escribe un monto válido, por ejemplo 450.00.");
      return;
    }
    setValidando(true);
    try {
      await api.post("/pagos/validar", { creditoId: id, montoCentavos: centavos, claveIdempotencia: clave, fecha });
      setMontoAprobado(centavos);
      setMostrarAprobacion(true);
    } catch (e) {
      mostrarErrorApi(e);
    } finally {
      setValidando(false);
    }
  }

  /** Paso 2: la persona aprueba -> token de un solo uso -> registro. */
  async function confirmar() {
    if (montoAprobado === null) return;
    setProcesando(true);
    try {
      const aprob = await api.post<{ tokenAprobacion: string | null; yaAplicado: boolean }>("/pagos/solicitar-aprobacion", {
        creditoId: id,
        montoCentavos: montoAprobado,
        claveIdempotencia: clave,
        fecha,
      });
      const resultado = await api.post<ResultadoPago>("/pagos", {
        creditoId: id,
        montoCentavos: montoAprobado,
        claveIdempotencia: clave,
        fecha,
        ...(aprob.tokenAprobacion ? { tokenAprobacion: aprob.tokenAprobacion } : {}),
      });
      setEstado({ tipo: "confirmado", resultado });
      setMostrarAprobacion(false);
      toast.mostrar(resultado.yaAplicado ? "Este cobro ya estaba registrado." : "Cobro registrado.", resultado.yaAplicado ? "info" : "exito");
      api.get<HistorialCobros>(`/creditos/${id}/pagos`).then(setHistorial).catch(() => undefined);
      api.get<CreditoDetalle>(conFecha(`/creditos/${id}`)).then(setCredito).catch(() => undefined);
    } catch (e) {
      setMostrarAprobacion(false);
      mostrarErrorApi(e);
    } finally {
      setProcesando(false);
    }
  }

  const volverA = `${base}/credito/${id}`;
  const exigible = estado.tipo === "listo" ? estado.previsualizacion.montoExigibleCentavos : null;

  return (
    <div>
      <EncabezadoPantalla titulo="Registrar pago" subtitulo={`Crédito ${id} · ${formatearFecha(fecha)}`} conRegreso volverA={volverA} />

      <div className="flex flex-col gap-4 px-4 py-4">
        {estado.tipo === "cargando" && <EsqueletoLista filas={2} />}
        {estado.tipo === "error_carga" && <Alerta onReintentar={cargar}>{estado.mensaje}</Alerta>}
        {estado.tipo === "sin_pendientes" && <Alerta tono="exito" titulo="Sin cuotas pendientes">Todas las cuotas de este crédito están saldadas a la fecha de hoy.</Alerta>}
        {errorGeneral && <Alerta titulo={errorGeneral.titulo}>{errorGeneral.texto}</Alerta>}

        {exigible !== null && (
          <div className="tarjeta flex flex-col gap-2">
            <label htmlFor="monto" className="etiqueta">
              Monto que recibes del cliente (Q)
            </label>
            <input
              id="monto"
              className={`campo cifra min-h-[56px] text-2xl font-semibold text-navy ${errorMonto ? "campo-error" : ""}`}
              inputMode="decimal"
              value={montoTexto}
              onChange={(e) => {
                setMontoTexto(e.target.value);
                setErrorMonto(null);
              }}
              aria-invalid={errorMonto ? true : undefined}
              aria-describedby="monto-ayuda"
            />
            <p id="monto-ayuda" className={`text-xs ${errorMonto ? "font-medium text-mora" : "text-tinta/60"}`}>
              {errorMonto ?? `Cuota exigible hoy: ${quetzales(exigible)}. El sistema sólo acepta el monto exacto.`}
            </p>
          </div>
        )}

        {credito && (
          <div className="grid grid-cols-2 gap-3">
            <div className="tarjeta">
              <p className="etiqueta">Cuotas pagadas</p>
              <p className="cifra text-2xl font-semibold">{credito.cuotasPagadas}<span className="text-base text-tinta/50"> / {credito.numeroCuotas}</span></p>
            </div>
            <div className="tarjeta">
              <p className="etiqueta">Saldo</p>
              <p className="cifra text-lg font-semibold">{formatearDinero(credito.saldoCapital)}</p>
            </div>
          </div>
        )}

        {historial && (
          <div className="tarjeta !p-0">
            <p className="px-4 pb-2 pt-4 text-sm font-semibold">Cobros registrados</p>
            {historial.cobros.length === 0 ? (
              <p className="etiqueta px-4 pb-4">Todavía no hay cobros registrados.</p>
            ) : (
              <div className="divide-y divide-linea">
                {historial.cobros.map((c) => (
                  <div key={c.numero} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-tinta/70">
                      Cobro #{c.numero} <span className="text-xs text-tinta/50">· {formatearFecha(c.fecha)}</span>
                    </span>
                    <span className="cifra text-sm font-medium">{formatearDinero(c.monto)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-linea px-4 py-3">
              <span className="text-sm font-semibold">Total abonado</span>
              <span className="cifra text-base font-semibold text-verde-oscuro">{formatearDinero(historial.totalAbonado)}</span>
            </div>
          </div>
        )}

        {estado.tipo === "confirmado" && (
          <Alerta tono="exito" titulo={estado.resultado.yaAplicado ? "Este cobro ya estaba registrado" : "Cobro registrado"}>
            {estado.resultado.yaAplicado ? "No se cobró dos veces." : `Cuota ${estado.resultado.cuotaSaldada ? "saldada" : "con pago parcial"}.`}
          </Alerta>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-linea bg-white/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        {estado.tipo === "listo" && (
          <button className="boton-cta" onClick={aceptar} disabled={validando}>
            {validando ? "Revisando el monto…" : "Aceptar y revisar"}
          </button>
        )}
        {(estado.tipo === "confirmado" || estado.tipo === "sin_pendientes" || estado.tipo === "error_carga") && (
          <Link to={volverA} className="boton-secundario">
            Volver al crédito
          </Link>
        )}
      </div>

      {mostrarAprobacion && estado.tipo === "listo" && (
        <HojaAprobacionPago previsualizacion={estado.previsualizacion} procesando={procesando} onConfirmar={confirmar} onCancelar={() => setMostrarAprobacion(false)} />
      )}
    </div>
  );
}
