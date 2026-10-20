import { useState } from "react";
import Alerta from "../../componentes/Alerta";
import GraficaBarras from "../../componentes/GraficaBarras";
import TarjetaKpi from "../../componentes/TarjetaKpi";
import { useFechaOperacion } from "../../contexto/FechaOperacionContext";
import { useToast } from "../../contexto/ToastContext";
import { api, mensajeError } from "../../lib/api";
import { formatearPorcentaje, quetzales } from "../../lib/dinero";
import { fechaLarga } from "../../lib/fecha";
import type { Cierre as CierreTipo } from "../../lib/tipos";

/** Cierre diario o mensual a la fecha de corte de la barra superior. Es repetible: no duplica movimientos. */
export default function Cierre() {
  const { fecha } = useFechaOperacion();
  const toast = useToast();
  const [tipo, setTipo] = useState<"DIARIO" | "MENSUAL">("MENSUAL");
  const [cierre, setCierre] = useState<CierreTipo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar() {
    setCargando(true);
    setError(null);
    try {
      const r = await api.post<CierreTipo>(`/cierres/${tipo === "DIARIO" ? "diario" : "mensual"}`, { fechaCorte: fecha });
      setCierre(r);
      toast.mostrar(`Cierre ${tipo === "DIARIO" ? "diario" : "mensual"} ejecutado.`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo ejecutar el cierre."));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Cierres</h1>
        <p className="text-sm text-tinta/60">Se ejecutan a la fecha de corte de la barra superior. Repetirlos recalcula el mismo resultado sin duplicar nada.</p>
      </div>

      <div className="tarjeta flex flex-wrap items-end gap-4">
        <div>
          <p className="etiqueta mb-1">Fecha de corte</p>
          <p className="min-h-[48px] py-3 font-medium">{fechaLarga(fecha)}</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Tipo de cierre
          <select className="campo min-h-[48px]" value={tipo} onChange={(e) => setTipo(e.target.value as "DIARIO" | "MENSUAL")}>
            <option value="DIARIO">Diario</option>
            <option value="MENSUAL">Mensual</option>
          </select>
        </label>
        <button className="boton-cta w-auto" disabled={cargando} onClick={ejecutar}>
          {cargando ? "Procesando…" : "Ejecutar cierre"}
        </button>
      </div>

      {error && <Alerta>{error}</Alerta>}

      {cierre && (
        <>
          <p className="text-sm text-tinta/60">
            Cierre {cierre.tipo === "DIARIO" ? "diario" : "mensual"} al {fechaLarga(cierre.fechaCorte)}.
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <TarjetaKpi etiqueta="Desembolsos del período" valor={quetzales(cierre.desembolsosCentavos)} acento="navy" />
            <TarjetaKpi etiqueta="Cartera activa" valor={quetzales(cierre.carteraActivaCentavos)} acento="verde" />
            <TarjetaKpi etiqueta="Cartera en riesgo" valor={quetzales(cierre.carteraEnRiesgoCentavos)} acento="mora" />
            <TarjetaKpi etiqueta="Porcentaje en riesgo" valor={formatearPorcentaje(cierre.porcentajeEnRiesgo)} acento="mora" />
          </div>
          <section className="tarjeta">
            <h2 className="mb-4 font-display text-base font-semibold">Recuperaciones por concepto</h2>
            <GraficaBarras
              descripcion="Recuperaciones por concepto"
              datos={[
                { etiqueta: "Gastos de cobranza", valor: cierre.recuperacionGastosCentavos, texto: quetzales(cierre.recuperacionGastosCentavos), color: "#D9A441" },
                { etiqueta: "Interés por mora", valor: cierre.recuperacionInteresMoratorioCentavos, texto: quetzales(cierre.recuperacionInteresMoratorioCentavos), color: "#C23B32" },
                { etiqueta: "Interés de las cuotas", valor: cierre.recuperacionInteresCorrienteCentavos, texto: quetzales(cierre.recuperacionInteresCorrienteCentavos), color: "#15304D" },
                { etiqueta: "Capital", valor: cierre.recuperacionCapitalCentavos, texto: quetzales(cierre.recuperacionCapitalCentavos), color: "#2E9E5B" },
              ]}
            />
            <p className="mt-3 text-sm text-tinta/60">Dado por incobrable en el período: <span className="cifra font-medium">{quetzales(cierre.incobrablePeriodoCentavos)}</span></p>
          </section>
        </>
      )}

      {!cierre && !error && <p className="text-sm text-tinta/60">Elige el tipo y ejecuta el cierre para ver el desglose.</p>}
    </div>
  );
}
