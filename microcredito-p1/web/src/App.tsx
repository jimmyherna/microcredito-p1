import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RutaProtegida from "./componentes/RutaProtegida";
import ShellEscritorio from "./componentes/ShellEscritorio";
import ShellMovil from "./componentes/ShellMovil";
import ShellPorRol from "./componentes/ShellPorRol";
import { inicioDeRol, useSesion } from "./contexto/SesionContext";

import AuthEleccion from "./paginas/auth/AuthEleccion";
import IniciarSesion from "./paginas/auth/IniciarSesion";
import PantallaInicio from "./paginas/auth/PantallaInicio";
import Registrarte from "./paginas/auth/Registrarte";

import Ayuda from "./paginas/Ayuda";
import DetalleCredito from "./paginas/DetalleCredito";
import DetalleMora from "./paginas/DetalleMora";
import DetalleSolicitud from "./paginas/DetalleSolicitud";
import ListaCreditos from "./paginas/ListaCreditos";
import MenuPrincipal from "./paginas/MenuPrincipal";
import MiCuenta from "./paginas/MiCuenta";
import PlanAmortizacion from "./paginas/PlanAmortizacion";
import RegistroPago from "./paginas/RegistroPago";
import SolicitudCredito from "./paginas/SolicitudCredito";

import BandejaSolicitudes from "./paginas/gerencia/BandejaSolicitudes";
import Bitacora from "./paginas/gerencia/Bitacora";
import Cierre from "./paginas/gerencia/Cierre";
import ListaCreditosGerencia from "./paginas/gerencia/ListaCreditosGerencia";
import TableroGerencial from "./paginas/gerencia/TableroGerencial";
import Usuarios from "./paginas/gerencia/Usuarios";

/**
 * Mapa de rutas por rol:
 *   públicas   /  /auth  /login  /registro
 *   cliente    /menu /solicitud /solicitud/:id /creditos /credito/:id /plan/:id /mora/:id
 *   asesor     lo anterior + /pago/:id (registrar pagos)
 *   gerencia   /gerencia/{tablero,solicitudes,creditos,bitacora,usuarios,cierre} y credito|pago|plan|mora/:id
 *   todos      /ayuda  /cuenta
 * Un rol en una ruta ajena se redirige a su propio inicio (RutaProtegida).
 */
function Angosta({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl [&>div>div:first-child]:px-4">{children}</div>;
}

function Desconocida() {
  const { usuario } = useSesion();
  return <Navigate to={usuario ? inicioDeRol(usuario.rol) : "/"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PantallaInicio />} />
      <Route path="/auth" element={<AuthEleccion />} />
      <Route path="/login" element={<IniciarSesion />} />
      <Route path="/registro" element={<Registrarte />} />

      {/* Cliente y asesor: móvil (PWA) */}
      <Route element={<RutaProtegida rolesPermitidos={["cliente", "asesor"]} />}>
        <Route element={<ShellMovil />}>
          <Route path="/menu" element={<MenuPrincipal />} />
          <Route path="/solicitud" element={<SolicitudCredito />} />
          <Route path="/solicitud/:id" element={<DetalleSolicitud />} />
          <Route path="/creditos" element={<ListaCreditos />} />
          <Route path="/credito/:id" element={<DetalleCredito />} />
          <Route path="/plan/:id" element={<PlanAmortizacion />} />
          <Route path="/mora/:id" element={<DetalleMora />} />
        </Route>
      </Route>

      {/* Sólo asesor: registrar pagos */}
      <Route element={<RutaProtegida rolesPermitidos={["asesor"]} />}>
        <Route element={<ShellMovil />}>
          <Route path="/pago/:id" element={<RegistroPago />} />
        </Route>
      </Route>

      {/* Gerencia: escritorio */}
      <Route element={<RutaProtegida rolesPermitidos={["gerencia"]} />}>
        <Route element={<ShellEscritorio />}>
          <Route path="/gerencia" element={<Navigate to="/gerencia/tablero" replace />} />
          <Route path="/gerencia/tablero" element={<TableroGerencial />} />
          <Route path="/gerencia/solicitudes" element={<BandejaSolicitudes />} />
          <Route path="/gerencia/creditos" element={<ListaCreditosGerencia />} />
          <Route path="/gerencia/bitacora" element={<Bitacora />} />
          <Route path="/gerencia/usuarios" element={<Usuarios />} />
          <Route path="/gerencia/cierre" element={<Cierre />} />
          <Route path="/gerencia/credito/:id" element={<Angosta><DetalleCredito /></Angosta>} />
          <Route path="/gerencia/pago/:id" element={<Angosta><RegistroPago /></Angosta>} />
          <Route path="/gerencia/plan/:id" element={<Angosta><PlanAmortizacion /></Angosta>} />
          <Route path="/gerencia/mora/:id" element={<Angosta><DetalleMora /></Angosta>} />
        </Route>
      </Route>

      {/* Comunes a todos los roles */}
      <Route element={<RutaProtegida />}>
        <Route element={<ShellPorRol />}>
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/cuenta" element={<MiCuenta />} />
        </Route>
      </Route>

      <Route path="*" element={<Desconocida />} />
    </Routes>
  );
}
