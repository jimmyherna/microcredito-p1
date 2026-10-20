import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alerta from "./Alerta";
import { EsqueletoLista } from "./Esqueleto";
import Insignia from "./Insignia";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useSesion } from "../contexto/SesionContext";
import { useToast } from "../contexto/ToastContext";
import { api, mensajeError } from "../lib/api";
import { ETIQUETA_SOLICITUD, formatearDinero, formatearFecha } from "../lib/dinero";
import type { Asesor, FilaCredito, FilaPlanSimulado, PoliticaCredito, SolicitudDetalle } from "../lib/tipos";
import { useBase } from "../lib/rutas";

/**
 * Ciclo de vida de una solicitud: En revisión -> (gerencia) Aprobada / Rechazada -> (asesor o gerencia) desembolso.
 * El plan se simula en el servidor y se muestra completo ANTES de confirmar el desembolso.
 * Ninguna cifra financiera se calcula aquí.
 */
export default function PanelSolicitud({ id, onCambio }: { id: string; onCambio?: () => void }) {
  const base = useBase();
  const navegar = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { fecha, conFecha } = useFechaOperacion();
  const esGerencia = usuario?.rol === "gerencia";
  const esAsesor = usuario?.rol === "asesor";

  const [sol, setSol] = useState<SolicitudDetalle | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [accion, setAccion] = useState<"APRUEBA" | "RECHAZA" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [asesorId, setAsesorId] = useState("");
  const [politica, setPolitica] = useState<PoliticaCredito | null>(null);
  const [tna, setTna] = useState("");
  const [plan, setPlan] = useState<FilaPlanSimulado[] | null>(null);
  const [tea, setTea] = useState<number | null>(null);
  const [creditoExistente, setCreditoExistente] = useState<string | null>(null);

  function cargar() {
    setErrorCarga(null);
    api
      .get<SolicitudDetalle>(`/solicitudes/${id}`)
      .then(setSol)
      .catch((e) => setErrorCarga(mensajeError(e, "No se pudo cargar la solicitud.")));
  }
  useEffect(cargar, [id]);

  const aprobada = sol?.estado === "APROBADO";
  useEffect(() => {
    if (!aprobada) return;
    setCreditoExistente(sol?.creditoId ?? null);
    api
      .get<PoliticaCredito>(conFecha("/politica-credito"))
      .then((p) => {
        setPolitica(p);
        setTna((t) => t || String(p.tnaDefectoBps / 100));
      })
      .catch(() => undefined);
    if (esGerencia) {
      api
        .get<Asesor[]>("/asesores")
        .then((a) => {
          setAsesores(a);
          setAsesorId((x) => x || a[0]?.id || "");
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aprobada, id, esGerencia, fecha]);

  async function decidir() {
    if (!accion) return;
    if (accion === "RECHAZA" && motivo.trim().length < 3) {
      setErrorMotivo("Escribe el motivo del rechazo: el solicitante lo verá.");
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await api.post(`/solicitudes/${id}/evaluar`, { decision: accion, motivo: motivo.trim() || (accion === "APRUEBA" ? "Aprobada por el comité" : undefined) });
      toast.mostrar(accion === "APRUEBA" ? "Solicitud aprobada." : "Solicitud rechazada.", accion === "APRUEBA" ? "exito" : "info");
      setAccion(null);
      setMotivo("");
      cargar();
      onCambio?.();
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar la decisión."));
    } finally {
      setOcupado(false);
    }
  }

  const tnaBps = /^\d+(\.\d{1,2})?$/.test(tna.trim()) ? Math.round(parseFloat(tna) * 100) : null;
  const errorTna =
    tna.trim() === "" || tnaBps === null
      ? "Escribe la tasa anual, por ejemplo 36."
      : politica && (tnaBps < politica.tnaMinBps || tnaBps > politica.tnaMaxBps)
        ? `La tasa debe estar entre ${politica.tnaMinBps / 100} % y ${politica.tnaMaxBps / 100} %.`
        : null;
  const asesorElegido = esAsesor ? usuario?.asesorId ?? "" : asesorId;

  async function simular() {
    if (!sol || errorTna || tnaBps === null) {
      setError(errorTna ?? "Revisa la tasa.");
      return;
    }
    setError(null);
    setOcupado(true);
    try {
      const r = await api.post<{ tea: number; filas: FilaPlanSimulado[] }>(conFecha("/plan-simulado"), { capitalCentavos: sol.montoSolicitado.centavos, tnaBps, plazoMeses: sol.plazoMeses });
      setPlan(r.filas);
      setTea(r.tea);
    } catch (e) {
      setError(mensajeError(e, "No se pudo simular el plan."));
    } finally {
      setOcupado(false);
    }
  }

  async function desembolsar() {
    if (tnaBps === null || !asesorElegido) {
      setError("Elige el asesor responsable del crédito.");
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const c = await api.post<{ id: string }>(`/solicitudes/${id}/desembolsar`, { asesorId: asesorElegido, fechaDesembolso: fecha, tnaBps });
      toast.mostrar("Crédito desembolsado.");
      onCambio?.();
      navegar(`${base}/credito/${c.id}`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo desembolsar."));
    } finally {
      setOcupado(false);
    }
  }

  if (!sol) return errorCarga ? <Alerta onReintentar={cargar}>{errorCarga}</Alerta> : <EsqueletoLista filas={1} />;

  const puedeDesembolsar = (esGerencia || esAsesor) && aprobada && !creditoExistente;

  return (
    <div className="flex flex-col gap-4">
      {error && <Alerta>{error}</Alerta>}

      <div className="tarjeta flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display font-semibold">Solicitud {sol.id}</p>
          <Insignia valor={sol.estado}>{ETIQUETA_SOLICITUD[sol.estado] ?? sol.estado}</Insignia>
        </div>
        {usuario?.rol !== "cliente" && <p className="text-sm text-tinta/70">{sol.clienteNombre}</p>}
        <p className="cifra text-xl font-semibold">
          {formatearDinero(sol.montoSolicitado)} <span className="text-sm font-normal text-tinta/60">· {sol.plazoMeses} meses</span>
        </p>
        <p className="text-xs text-tinta/55">Solicitada el {formatearFecha(sol.fechaSolicitud)}</p>
      </div>

      {sol.estado === "SOLICITADO" &&
        (esGerencia ? (
          accion === null ? (
            <div className="flex gap-3">
              <button className="boton-cta flex-1" onClick={() => setAccion("APRUEBA")}>Aprobar</button>
              <button className="boton-secundario flex-1" onClick={() => setAccion("RECHAZA")}>Rechazar</button>
            </div>
          ) : (
            <div className="tarjeta flex flex-col gap-3">
              <label htmlFor="motivo" className="text-sm font-medium">
                {accion === "RECHAZA" ? "Motivo del rechazo" : "Comentario (opcional)"}
              </label>
              <textarea
                id="motivo"
                className={`campo min-h-[88px] ${errorMotivo ? "campo-error" : ""}`}
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setErrorMotivo(null);
                }}
                aria-invalid={errorMotivo ? true : undefined}
                aria-describedby={errorMotivo ? "motivo-error" : undefined}
              />
              {errorMotivo && <p id="motivo-error" className="text-xs font-medium text-mora">{errorMotivo}</p>}
              <div className="flex gap-3">
                <button className="boton-cta flex-1" disabled={ocupado} onClick={decidir}>
                  {ocupado ? "Guardando…" : accion === "APRUEBA" ? "Confirmar aprobación" : "Confirmar rechazo"}
                </button>
                <button className="boton-secundario" disabled={ocupado} onClick={() => { setAccion(null); setErrorMotivo(null); }}>
                  Cancelar
                </button>
              </div>
            </div>
          )
        ) : (
          <Alerta tono="aviso" titulo="En revisión">El comité de crédito la está revisando. Verás aquí la respuesta.</Alerta>
        ))}

      {sol.estado === "RECHAZADO" && <Alerta titulo="Solicitud rechazada">{sol.motivoDecision ?? "El comité no aprobó esta solicitud."}</Alerta>}

      {aprobada && creditoExistente && (
        <Alerta tono="exito" titulo="Crédito desembolsado">
          <Link to={`${base}/credito/${creditoExistente}`} className="font-semibold underline">Ver el crédito {creditoExistente}</Link>
        </Alerta>
      )}

      {aprobada && !creditoExistente && !puedeDesembolsar && (
        <Alerta tono="exito" titulo="Aprobada">Tu solicitud fue aprobada. Falta el desembolso: te avisaremos cuando el crédito esté activo.</Alerta>
      )}

      {puedeDesembolsar && (
        <div className="tarjeta flex flex-col gap-3">
          <p className="font-display font-semibold">Desembolso</p>
          {esGerencia && (
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Asesor responsable
              <select className="campo min-h-[48px]" value={asesorId} onChange={(e) => setAsesorId(e.target.value)}>
                {asesores.length === 0 && <option value="">Cargando…</option>}
                {asesores.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Tasa nominal anual (%)
            <input className={`campo cifra min-h-[48px] ${tna && errorTna ? "campo-error" : ""}`} inputMode="decimal" value={tna} onChange={(e) => { setTna(e.target.value); setPlan(null); }} />
            {tna && errorTna ? <span className="text-xs font-medium text-mora">{errorTna}</span> : politica && <span className="text-xs font-normal text-tinta/55">Permitido: {politica.tnaMinBps / 100} % a {politica.tnaMaxBps / 100} %.</span>}
          </label>
          <p className="text-xs text-tinta/60">Fecha de desembolso: {formatearFecha(fecha)}.</p>
          <button className="boton-primario" disabled={ocupado} onClick={simular}>
            {ocupado && !plan ? "Calculando…" : "Ver el plan simulado"}
          </button>

          {plan && (
            <>
              {tea !== null && <p className="text-sm">Tasa efectiva anual: <span className="cifra font-semibold">{(tea * 100).toFixed(2)} %</span></p>}
              <div className="max-h-72 overflow-auto rounded-lg border border-linea">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-papel-hueso">
                    <tr className="text-left">
                      <th scope="col" className="p-2">#</th>
                      <th scope="col" className="p-2 text-right">Cuota</th>
                      <th scope="col" className="p-2 text-right">Capital</th>
                      <th scope="col" className="p-2 text-right">Interés</th>
                    </tr>
                  </thead>
                  <tbody className="cifra">
                    {plan.map((f) => (
                      <tr key={f.numeroCuota} className="border-t border-linea">
                        <td className="p-2">{f.numeroCuota}</td>
                        <td className="p-2 text-right">{formatearDinero(f.cuota)}</td>
                        <td className="p-2 text-right">{formatearDinero(f.capital)}</td>
                        <td className="p-2 text-right">{formatearDinero(f.interes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="boton-cta" disabled={ocupado} onClick={desembolsar}>
                {ocupado ? "Desembolsando…" : "Confirmar desembolso"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
