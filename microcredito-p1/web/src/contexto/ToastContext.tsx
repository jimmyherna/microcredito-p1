import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Tipo = "exito" | "error" | "info";
interface Toast {
  id: number;
  texto: string;
  tipo: Tipo;
}

interface Valor {
  mostrar: (texto: string, tipo?: Tipo) => void;
}

const Ctx = createContext<Valor | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const contador = useRef(0);

  const quitar = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const mostrar = useCallback(
    (texto: string, tipo: Tipo = "exito") => {
      const id = ++contador.current;
      setToasts((t) => [...t.slice(-2), { id, texto, tipo }]);
      window.setTimeout(() => quitar(id), tipo === "error" ? 6000 : 3500);
    },
    [quitar]
  );
  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  const color: Record<Tipo, string> = {
    exito: "bg-verde-oscuro text-white",
    error: "bg-mora text-white",
    info: "bg-navy text-white",
  };

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-entra pointer-events-auto max-w-sm rounded-tarjeta px-4 py-3 text-sm font-medium shadow-tarjeta ${color[t.tipo]}`}>
            {t.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): Valor {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return v;
}
