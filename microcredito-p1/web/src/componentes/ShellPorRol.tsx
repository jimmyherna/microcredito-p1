import { useSesion } from "../contexto/SesionContext";
import ShellEscritorio from "./ShellEscritorio";
import ShellMovil from "./ShellMovil";

/** Para rutas comunes (/ayuda, /cuenta): gerencia en escritorio; cliente y asesor en móvil. */
export default function ShellPorRol() {
  const { usuario } = useSesion();
  return usuario?.rol === "gerencia" ? <ShellEscritorio /> : <ShellMovil />;
}
