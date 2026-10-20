import { useMemo, useState } from "react";
import Alerta from "../../componentes/Alerta";
import { EsqueletoLista } from "../../componentes/Esqueleto";
import Insignia from "../../componentes/Insignia";
import TablaDatos, { type Columna } from "../../componentes/TablaDatos";
import { api } from "../../lib/api";
import { ETIQUETA_ROL } from "../../lib/dinero";
import { fechaHora } from "../../lib/fecha";
import type { FilaBitacora } from "../../lib/tipos";
import { useCarga } from "../../lib/useCarga";

type FiltroRol = "todos" | "cliente" | "asesor" | "gerencia";

/** Bitácora de actividad: qué hacen usuarios y asesores (control gerencial). */
export default function Bitacora() {
  const [limite, setLimite] = useState(100);
  const [rol, setRol] = useState<FiltroRol>("todos");
  const { datos, error, cargando, recargar } = useCarga(() => api.get<FilaBitacora[]>(`/gerencia/bitacora?limite=${limite}`), [limite]);

  const filas = useMemo(() => (datos ?? []).filter((b) => rol === "todos" || b.rol === rol), [datos, rol]);

  const columnas: Columna<FilaBitacora>[] = [
    { clave: "fecha", titulo: "Fecha y hora", render: (b) => <span className="cifra whitespace-nowrap">{fechaHora(b.fecha)}</span>, valor: (b) => b.fecha },
    { clave: "usuario", titulo: "Usuario", render: (b) => b.usuarioNombre, valor: (b) => b.usuarioNombre },
    { clave: "rol", titulo: "Rol", render: (b) => <Insignia valor={b.rol}>{ETIQUETA_ROL[b.rol] ?? b.rol}</Insignia>, valor: (b) => b.rol },
    { clave: "accion", titulo: "Acción", render: (b) => <span className="font-medium">{b.accion}</span>, valor: (b) => b.accion },
    { clave: "detalle", titulo: "Detalle", render: (b) => <span className="text-tinta/70">{b.detalle ?? "—"}</span> },
  ];

  const chips: [FiltroRol, string][] = [["todos", "Todos"], ["cliente", "Clientes"], ["asesor", "Asesores"], ["gerencia", "Gerencia"]];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Bitácora de actividad</h1>
        <p className="text-sm text-tinta/60">Registro de lo que hacen usuarios y asesores: cuentas, solicitudes, aprobaciones, desembolsos, pagos y cierres.</p>
      </div>
      {error && <Alerta onReintentar={recargar}>{error}</Alerta>}
      {cargando && !datos && <EsqueletoLista filas={3} />}
      {datos && (
        <>
          <TablaDatos
            filas={filas}
            columnas={columnas}
            idFila={(b) => String(b.id)}
            textoBusqueda={(b) => `${b.usuarioNombre} ${b.accion} ${b.detalle ?? ""}`}
            placeholderBusqueda="Buscar por persona, acción o detalle"
            vacio="Aún no hay actividad registrada."
            filtros={
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por rol">
                {chips.map(([v, t]) => (
                  <button key={v} type="button" className="chip !min-h-[40px]" aria-pressed={rol === v} onClick={() => setRol(v)}>
                    {t}
                  </button>
                ))}
              </div>
            }
          />
          {datos.length >= limite && (
            <button className="boton-secundario w-fit" onClick={() => setLimite((l) => Math.min(500, l + 100))} disabled={limite >= 500}>
              Mostrar más movimientos
            </button>
          )}
        </>
      )}
    </div>
  );
}
