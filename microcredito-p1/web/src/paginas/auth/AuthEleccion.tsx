import { Navigate, useNavigate } from "react-router-dom";
import Logo from "../../componentes/Logo";
import { inicioDeRol, useSesion } from "../../contexto/SesionContext";

export default function AuthEleccion() {
  const navegar = useNavigate();
  const { usuario, validando } = useSesion();
  if (usuario && !validando) return <Navigate to={inicioDeRol(usuario.rol)} replace />;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-white px-6">
      <Logo tamano="lg" />
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button className="boton-primario" onClick={() => navegar("/login")}>
          Iniciar sesión
        </button>
        <button className="boton-secundario" onClick={() => navegar("/registro")}>
          Crear una cuenta
        </button>
      </div>
    </div>
  );
}
