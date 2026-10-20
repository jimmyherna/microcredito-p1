import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { formatearDinero } from "../lib/dinero";
import type { MensajeChat } from "../lib/tipos";

/**
 * E5: chat gerencial integrado a la interfaz (nunca una ventana aparte).
 * Mantiene memoria de sesión enviando el hilo completo en cada turno
 * (ver src/chat/orquestador.ts en el backend) y muestra el paso de
 * aprobación humana cuando el asistente propone registrar un pago
 * (capacidad sensible — nunca se ejecuta sin que la persona toque
 * "Aprobar").
 */
export default function ChatGerencial() {
  const { fecha: fechaOperacion } = useFechaOperacion();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    { id: "bienvenida", autor: "asistente", texto: "Soy el asistente gerencial de Crédito Vecino. Pregúnteme por cartera, cierres, un crédito o una política — con fuente citada cuando aplique." },
  ]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aprobando, setAprobando] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  async function enviar() {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    const mensajeUsuario: MensajeChat = { id: crypto.randomUUID(), autor: "usuario", texto: contenido };
    setMensajes((m) => [...m, mensajeUsuario]);
    setTexto("");
    setEnviando(true);
    try {
      const historial = [...mensajes, mensajeUsuario].map((m) => ({ autor: m.autor, texto: m.texto }));
      const fechaCorte = fechaOperacion;
      const respuesta = await api.post<MensajeChat>("/chat", { historial, fechaCorte });
      setMensajes((m) => [...m, { ...respuesta, id: crypto.randomUUID() }]);
    } catch {
      setMensajes((m) => [...m, { id: crypto.randomUUID(), autor: "asistente", texto: "No pude procesar la pregunta. Intente de nuevo." }]);
    } finally {
      setEnviando(false);
      setTimeout(() => finRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  async function aprobarPago(mensaje: MensajeChat) {
    if (!mensaje.requiereAprobacion) return;
    setAprobando(mensaje.id);
    try {
      // El asistente solo PROPUSO el pago (requiereAprobacion); el token
      // se pide justo aquí, cuando la persona de verdad toca "Aprobar y
      // registrar" en esta tarjeta — nunca lo genera el modelo de lenguaje.
      const { creditoId, montoCentavos } = mensaje.requiereAprobacion;
      const claveIdempotencia = crypto.randomUUID();
      const { tokenAprobacion } = await api.post<{ tokenAprobacion: string }>("/pagos/solicitar-aprobacion", {
        creditoId,
        montoCentavos,
        claveIdempotencia,
      });
      await api.post("/pagos", {
        creditoId,
        montoCentavos,
        claveIdempotencia,
        fecha: fechaOperacion,
        tokenAprobacion,
      });
      setMensajes((m) => [
        ...m,
        { id: crypto.randomUUID(), autor: "asistente", texto: "Pago aprobado y registrado. El estado del crédito se actualizó." },
      ]);
    } catch {
      setMensajes((m) => [...m, { id: crypto.randomUUID(), autor: "asistente", texto: "No se pudo registrar el pago." }]);
    } finally {
      setAprobando(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {mensajes.map((m) => (
            <div key={m.id} className={`flex ${m.autor === "usuario" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-tarjeta px-4 py-3 text-sm ${
                  m.autor === "usuario" ? "bg-quetzal text-white" : "border border-linea bg-papel"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.texto}</p>
                {m.citas && m.citas.length > 0 && (
                  <p className="mt-2 text-xs text-tinta/50">Fuente: {m.citas.map((c) => c.documento).join(", ")}</p>
                )}
                {m.requiereAprobacion && (
                  <div className="mt-3 rounded-lg border border-mango-oscuro/30 bg-mango-claro p-3">
                    <p className="mb-2 text-xs font-medium text-mango-oscuro">
                      Propone registrar {formatearDinero({ centavos: m.requiereAprobacion.montoCentavos, moneda: "GTQ" })} sobre{" "}
                      {m.requiereAprobacion.creditoId}. Requiere aprobación humana.
                    </p>
                    <button
                      className="rounded-lg bg-quetzal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={aprobando === m.id}
                      onClick={() => aprobarPago(m)}
                    >
                      {aprobando === m.id ? "Aprobando…" : "Aprobar y registrar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={finRef} />
        </div>
      </div>
      <div className="flex gap-2 border-t border-linea p-3">
        <input
          className="campo"
          placeholder="Pregunte a gerencia…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
        />
        <button className="boton-primario w-auto px-4" disabled={enviando} onClick={enviar}>
          {enviando ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
