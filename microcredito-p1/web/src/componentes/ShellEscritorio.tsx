import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import CajonChat from "./CajonChat";
import Icono, { type NombreIcono } from "./Icono";
import Logo from "./Logo";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useSesion } from "../contexto/SesionContext";
import { fechaLarga } from "../lib/fecha";
import { rutaAyuda } from "../lib/rutas";

const SECCIONES: { ruta: string; etiqueta: string; icono: NombreIcono }[] = [
  { ruta: "/gerencia/tablero", etiqueta: "Tablero", icono: "tablero" },
  { ruta: "/gerencia/solicitudes", etiqueta: "Solicitudes", icono: "solicitud" },
  { ruta: "/gerencia/creditos", etiqueta: "Créditos", icono: "credito" },
  { ruta: "/gerencia/bitacora", etiqueta: "Bitácora", icono: "bitacora" },
  { ruta: "/gerencia/usuarios", etiqueta: "Usuarios", icono: "usuarios" },
  { ruta: "/gerencia/cierre", etiqueta: "Cierres", icono: "cierre" },
];

function claseNav(activo: boolean): string {
  return `flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${activo ? "bg-verde text-white" : "text-white/75 hover:bg-white/10"}`;
}

/**
 * Cascarón de gerencia (escritorio): barra lateral, barra superior con fecha de corte, ayuda, asistente
 * y cuenta. El chat es un cajón lateral que se abre con un botón y se cierra con X / Esc.
 */
export default function ShellEscritorio() {
  const [chatAbierto, setChatAbierto] = useState(false);
  const { usuario, cerrar } = useSesion();
  const { fecha, setFecha, irAHoy, irACierrePaquete, esHoy, esCierrePaquete, hoy } = useFechaOperacion();
  const ubicacion = useLocation();

  return (
    <div className="min-h-screen bg-papel-hueso md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col bg-navy px-4 py-4 md:sticky md:top-0 md:h-screen md:py-6">
        <div className="mb-4 flex items-center gap-2.5 px-1 md:mb-8">
          <Logo tamano="sm" conTexto={false} />
          <div>
            <p className="font-display text-base font-semibold leading-tight text-white">CrediGest</p>
            <p className="text-xs text-white/60">Comité gerencial</p>
          </div>
        </div>
        <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {SECCIONES.map((s) => (
            <NavLink key={s.ruta} to={s.ruta} className={({ isActive }) => `${claseNav(isActive)} shrink-0`}>
              <Icono nombre={s.icono} tamano={20} />
              {s.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 hidden flex-col gap-1 md:mt-auto md:flex">
          <NavLink to="/ayuda" className={({ isActive }) => claseNav(isActive)}>
            <Icono nombre="ayuda" tamano={20} /> Ayuda
          </NavLink>
          <NavLink to="/cuenta" className={({ isActive }) => claseNav(isActive)}>
            <Icono nombre="usuario" tamano={20} /> Mi cuenta
          </NavLink>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/15 pt-3">
            <p className="truncate text-sm text-white/80">{usuario?.nombre}</p>
            <button onClick={() => cerrar()} className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-xs text-white/70 underline-offset-4 hover:underline">
              <Icono nombre="salir" tamano={16} /> Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-linea bg-papel/95 px-4 py-2 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Icono nombre="calendario" tamano={18} className="text-navy" />
              <span className="font-medium">Fecha de corte</span>
              <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className="campo cifra !w-auto !py-1.5 text-sm" aria-label="Fecha de corte" />
            </label>
            <button type="button" className="chip !min-h-[40px]" aria-pressed={esHoy} onClick={irAHoy} title={`Hoy: ${fechaLarga(hoy)}`}>
              Hoy
            </button>
            <button type="button" className="chip !min-h-[40px]" aria-pressed={esCierrePaquete} onClick={irACierrePaquete}>
              Cierre del paquete (31/10/2026)
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setChatAbierto(true)} className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-oscuro" aria-haspopup="dialog">
              <Icono nombre="chat" tamano={18} /> Asistente
            </button>
            <Link to={rutaAyuda(ubicacion.pathname)} aria-label="Ayuda sobre esta pantalla" className="boton-icono">
              <Icono nombre="ayuda" />
            </Link>
            <Link to="/cuenta" aria-label="Mi cuenta" className="boton-icono">
              <Icono nombre="usuario" />
            </Link>
          </div>
        </div>
        <main className="px-4 py-6 md:px-8">
          <div className="pantalla-entra mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <CajonChat abierto={chatAbierto} onCerrar={() => setChatAbierto(false)} />
    </div>
  );
}
