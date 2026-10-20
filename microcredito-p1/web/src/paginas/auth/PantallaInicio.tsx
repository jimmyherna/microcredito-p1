import { Navigate, useNavigate } from "react-router-dom";
import Logo from "../../componentes/Logo";
import { inicioDeRol, useSesion } from "../../contexto/SesionContext";

export default function PantallaInicio() {
  const navegar = useNavigate();
  const { usuario, validando } = useSesion();
  if (usuario && !validando) return <Navigate to={inicioDeRol(usuario.rol)} replace />;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-white px-6">
      <Logo tamano="lg" />
      <p className="max-w-xs text-center text-sm text-tinta/60">Tus créditos de Crédito Vecino, claros y a la mano.</p>
      <button className="boton-primario w-full max-w-xs" onClick={() => navegar("/auth")}>
        Comenzar
      </button>
    </div>
  );
}
