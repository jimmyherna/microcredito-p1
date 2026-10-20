import { NavLink, Outlet, useLocation } from "react-router-dom";
import Icono, { type NombreIcono } from "./Icono";

const PESTANAS: { ruta: string; etiqueta: string; icono: NombreIcono }[] = [
  { ruta: "/menu", etiqueta: "Inicio", icono: "inicio" },
  { ruta: "/creditos", etiqueta: "Créditos", icono: "credito" },
  { ruta: "/solicitud", etiqueta: "Solicitar", icono: "solicitud" },
  { ruta: "/ayuda", etiqueta: "Ayuda", icono: "ayuda" },
];

const RUTAS_PRINCIPALES = ["/menu", "/creditos", "/ayuda", "/cuenta"];

/**
 * Cascarón para cliente y asesor: PWA en columna angosta, pensada para una mano. La navegación
 * principal está abajo (zona del pulgar) y sólo en las pantallas de primer nivel; los flujos
 * (solicitud, cobro) usan su propia barra de acción para no competir con el teclado.
 */
export default function ShellMovil() {
  const { pathname } = useLocation();
  const conPestanas = RUTAS_PRINCIPALES.includes(pathname);
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-movil bg-white">
      <div className={`pantalla-entra ${conPestanas ? "pb-24" : ""}`} key={pathname}>
        <Outlet />
      </div>
      {conPestanas && (
        <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-movil border-t border-linea bg-white/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {PESTANAS.map((p) => (
            <NavLink key={p.ruta} to={p.ruta} className={({ isActive }) => `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${isActive ? "text-navy" : "text-tinta/55"}`}>
              {({ isActive }) => (
                <>
                  <Icono nombre={p.icono} tamano={22} grosor={isActive ? 2.2 : 1.7} />
                  {p.etiqueta}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
