import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Icono from "./Icono";
import Logo from "./Logo";

/** Marco común de inicio de sesión y registro: columna angosta, logotipo y regreso. */
export default function PlantillaAuth({ titulo, subtitulo, children, pie }: { titulo: string; subtitulo?: string; children: ReactNode; pie?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-movil flex-col bg-white px-5 pb-8 pt-4">
      <Link to="/auth" className="-ml-2 inline-flex min-h-[44px] w-fit items-center gap-1 px-2 text-sm font-medium text-navy">
        <Icono nombre="atras" tamano={18} /> Volver
      </Link>
      <div className="my-4 flex justify-center">
        <Logo tamano="md" />
      </div>
      <h1 className="font-display text-2xl font-semibold">{titulo}</h1>
      {subtitulo && <p className="mb-5 mt-1 text-sm text-tinta/60">{subtitulo}</p>}
      <div className="mt-2 flex flex-col gap-4">{children}</div>
      {pie && <div className="mt-6 text-center text-sm text-tinta/70">{pie}</div>}
    </div>
  );
}
