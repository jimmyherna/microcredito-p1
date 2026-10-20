import { Navigate, Outlet, useLocation } from "react-router-dom";
import { inicioDeRol, useSesion } from "../contexto/SesionContext";
import type { Rol } from "../lib/tipos";
import Logo from "./Logo";

/** Exige sesión; si el rol no está permitido, redirige al inicio del rol propio. */
export default function RutaProtegida({ rolesPermitidos }: { rolesPermitidos?: Rol[] }) {
  const { usuario, validando } = useSesion();
  const ubicacion = useLocation();

  if (validando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white" role="status">
        <Logo tamano="md" />
        <p className="text-sm text-tinta/60">Verificando tu sesión…</p>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) return <Navigate to={inicioDeRol(usuario.rol)} replace />;
  return <Outlet />;
}
