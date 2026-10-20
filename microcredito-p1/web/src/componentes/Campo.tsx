import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  error?: string | null;
  ayuda?: string;
  opcional?: boolean;
  /** Contenido a la derecha dentro del campo (p. ej. botón mostrar/ocultar). */
  derecha?: ReactNode;
}

/** Campo de formulario con etiqueta, ayuda y error en línea, accesible. */
export default function Campo({ etiqueta, valor, onCambio, error, ayuda, opcional, derecha, className = "", ...resto }: Props) {
  const id = useId();
  const idMsg = `${id}-msg`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta} {opcional && <span className="font-normal text-tinta/50">(opcional)</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          {...resto}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? idMsg : undefined}
          className={`campo min-h-[48px] ${derecha ? "pr-14" : ""} ${error ? "campo-error" : ""} ${className}`}
        />
        {derecha && <div className="absolute inset-y-0 right-1 flex items-center">{derecha}</div>}
      </div>
      {(error || ayuda) && (
        <p id={idMsg} className={`text-xs ${error ? "font-medium text-mora" : "text-tinta/55"}`}>
          {error ?? ayuda}
        </p>
      )}
    </div>
  );
}
