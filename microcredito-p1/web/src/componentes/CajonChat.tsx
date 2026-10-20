import { useEffect, useRef } from "react";
import ChatGerencial from "../chat/ChatGerencial";
import Icono from "./Icono";
import LimiteError from "./LimiteError";

/**
 * Cajón lateral del asistente (sólo gerencia). Se abre desde el botón de la barra superior, tiene
 * botón de cerrar (X) visible, se cierra con Esc o tocando fuera, y nunca deja a la persona encerrada:
 * si el asistente falla, el cajón lo dice y se puede cerrar igual.
 */
export default function CajonChat({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const botonCerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    botonCerrar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-tinta/40" onClick={onCerrar}>
      <aside role="dialog" aria-modal="true" aria-labelledby="titulo-chat" className="cajon-entra flex h-full w-full max-w-md flex-col bg-papel-alto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-2 border-b border-linea bg-navy px-4 py-3 text-white">
          <div>
            <h2 id="titulo-chat" className="font-display text-base font-semibold">
              Asistente gerencial
            </h2>
            <p className="text-xs text-white/70">Consulta cartera, cierres y políticas</p>
          </div>
          <button ref={botonCerrar} type="button" onClick={onCerrar} aria-label="Cerrar asistente" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-medium hover:bg-white/25">
            <Icono nombre="cerrar" tamano={18} />
            Cerrar
          </button>
        </header>
        <div className="min-h-0 flex-1">
          <LimiteError
            alternativa={(reintentar) => (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="font-display text-lg font-semibold">El asistente no está disponible</p>
                <p className="text-sm text-tinta/60">Tuvo un problema y no puede responder ahora. El resto de la aplicación sigue funcionando con normalidad.</p>
                <button className="boton-primario" onClick={reintentar}>Reintentar</button>
                <button className="boton-secundario" onClick={onCerrar}>Cerrar el asistente</button>
              </div>
            )}
          >
            <ChatGerencial />
          </LimiteError>
        </div>
        <p className="border-t border-linea px-4 py-2 text-xs text-tinta/55">Si el asistente no responde, puedes cerrar este panel (Esc) y seguir trabajando.</p>
      </aside>
    </div>
  );
}
