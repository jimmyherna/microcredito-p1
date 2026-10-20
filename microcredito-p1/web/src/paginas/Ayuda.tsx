import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import EstadoVacio from "../componentes/EstadoVacio";
import Icono from "../componentes/Icono";
import { useSesion } from "../contexto/SesionContext";
import type { Rol } from "../lib/tipos";

interface Tema {
  id: string;
  roles: Rol[];
  pregunta: string;
  respuesta: string[];
  /** Enlace opcional a la pantalla relacionada. */
  enlace?: { texto: string; a: string };
}

const TEMAS: Tema[] = [
  {
    id: "inicio",
    roles: ["cliente", "asesor", "gerencia"],
    pregunta: "¿Cómo uso CrediGest?",
    respuesta: [
      "CrediGest te muestra tus créditos, cuánto debes y cuándo toca pagar. Todo lo que ves viene directamente del sistema de Crédito Vecino.",
      "En el celular, la barra de abajo te lleva a Inicio, Créditos, Solicitar y Ayuda. Arriba, el signo ? te abre la ayuda de la pantalla donde estás y el ícono de persona abre Mi cuenta.",
    ],
  },
  {
    id: "solicitar",
    roles: ["cliente"],
    pregunta: "¿Cómo solicito un crédito?",
    respuesta: [
      "1. Entra a Solicitar y elige el monto (entre Q1,000.00 y Q25,000.00) y el plazo en meses (de 3 a 24).",
      "2. La primera vez te pedimos tus datos: DPI, teléfono, municipio y dirección. Luego quedan guardados y no los vuelves a escribir.",
      "3. Revisa la cuota estimada y envía la solicitud. Verás que queda En revisión; el comité de crédito la aprueba o la rechaza y te lo mostramos en Inicio y en la solicitud.",
    ],
    enlace: { texto: "Ir a Solicitar", a: "/solicitud" },
  },
  {
    id: "solicitar",
    roles: ["asesor"],
    pregunta: "¿Cómo registro una solicitud para un cliente?",
    respuesta: [
      "1. En Solicitar, escribe los datos del cliente: nombre, DPI, teléfono y municipio. Si el DPI ya existe en el sistema, te avisamos.",
      "2. Elige monto y plazo y revisa el plan simulado con el cliente.",
      "3. Envía al comité. El cliente queda en tu cartera. Cuando gerencia apruebe la solicitud, vuelve a ella y toca Desembolsar.",
    ],
    enlace: { texto: "Nueva solicitud", a: "/solicitud" },
  },
  {
    id: "solicitar",
    roles: ["gerencia"],
    pregunta: "¿De dónde vienen las solicitudes?",
    respuesta: ["Las crean los clientes desde su cuenta y los asesores desde el campo. Todas llegan a la bandeja de Solicitudes, donde las apruebas o rechazas con un motivo."],
    enlace: { texto: "Ver solicitudes", a: "/gerencia/solicitudes" },
  },
  {
    id: "cuota-plan",
    roles: ["cliente", "asesor", "gerencia"],
    pregunta: "¿Qué es la cuota y qué es el plan de pagos?",
    respuesta: [
      "La cuota es lo que se paga cada mes. Incluye una parte del dinero prestado (capital) y una parte de interés, que es el costo del préstamo.",
      "El plan de pagos es la tabla con todas tus cuotas: cuándo vence cada una, cuánto es de capital, cuánto de interés y cuánto te queda por pagar después. Las cuotas pagadas aparecen en verde, la que toca pagar ahora en amarillo y las que ya pasaron de fecha sin pagarse en rojo.",
    ],
  },
  {
    id: "saldo",
    roles: ["cliente", "asesor", "gerencia"],
    pregunta: "No entiendo mi saldo, ¿qué hago?",
    respuesta: [
      "El saldo es lo que todavía falta pagar del dinero prestado (capital). No incluye el interés de las cuotas que aún no vencen.",
      "Para ver cuánto debes hoy, abre tu crédito: ahí aparece la próxima cuota y su fecha. Si hay atraso, la pantalla Detalle de mora te explica de dónde sale cada monto.",
      "Si después de revisar sigue sin cuadrar, habla con tu asesor y menciona el número de tu crédito y la fecha en que pagaste.",
    ],
    enlace: { texto: "Ver mis créditos", a: "/creditos" },
  },
  {
    id: "mora",
    roles: ["cliente", "asesor", "gerencia"],
    pregunta: "¿Qué es la mora?",
    respuesta: [
      "La mora es el costo extra que se cobra cuando una cuota no se paga a tiempo. Se cuenta desde el día siguiente a la fecha de vencimiento.",
      "Mientras más días pasan sin pagar, la tasa sube por tramos: 1 a 30 días, 31 a 60, 61 a 90 y 91 a 120. Pasados 120 días el crédito se considera incobrable y ya no admite pagos.",
      "La forma más barata de salir de una mora es pagar cuanto antes: cada día cuenta.",
    ],
  },
  {
    id: "pago",
    roles: ["cliente"],
    pregunta: "¿Cómo se paga mi cuota?",
    respuesta: [
      "Tu asesor de campo recibe tu pago y lo registra en el sistema; por eso en tu cuenta no hay un botón de pagar. Pide siempre tu comprobante.",
      "Cuando el pago queda registrado, tu saldo y tu plan se actualizan solos. El monto a pagar debe ser exacto: el que ves como próxima cuota (o el total si estás en mora).",
      "Si no tienes asesor asignado, acércate a una agencia de Crédito Vecino.",
    ],
  },
  {
    id: "pago",
    roles: ["asesor", "gerencia"],
    pregunta: "¿Cómo registro un pago?",
    respuesta: [
      "1. Abre el crédito (desde Créditos o con el botón Cobrar) y toca Registrar pago.",
      "2. Confirma el monto: el sistema sólo acepta el monto exacto de lo que se debe a la fecha de operación. Si no coincide, te muestra el monto correcto.",
      "3. Revisa el desglose (gastos, interés por mora, interés de la cuota y capital) y toca Aprobar y cobrar. Ese toque es la aprobación humana: sin él nada se registra.",
      "4. Si repites el mismo cobro por error (mala señal, doble toque), el sistema lo detecta y no cobra dos veces.",
    ],
  },
  {
    id: "aprobacion",
    roles: ["asesor"],
    pregunta: "¿Cómo se aprueba una solicitud y cuándo desembolso?",
    respuesta: [
      "Las solicitudes las aprueba o rechaza el comité (gerencia). Tú las ves como En revisión, Aprobada o Rechazada.",
      "Cuando una solicitud de tu cartera está Aprobada, ábrela, revisa el plan simulado y toca Confirmar desembolso. Se crea el crédito y empieza a correr su plan de pagos.",
    ],
    enlace: { texto: "Ver mi cartera", a: "/creditos" },
  },
  {
    id: "aprobacion",
    roles: ["gerencia"],
    pregunta: "¿Cómo apruebo o rechazo una solicitud?",
    respuesta: [
      "En Solicitudes, elige una solicitud En revisión. Toca Aprobar, o Rechazar y escribe el motivo (queda en la bitácora y el cliente lo ve).",
      "Una solicitud aprobada se desembolsa eligiendo el asesor y la tasa; el plan se simula antes de confirmar. Los clientes y asesores que se registran solos quedan sin asesor asignado: tú decides.",
    ],
    enlace: { texto: "Ir a Solicitudes", a: "/gerencia/solicitudes" },
  },
  {
    id: "gerencia-tablero",
    roles: ["gerencia"],
    pregunta: "¿Qué muestra el tablero?",
    respuesta: [
      "Cartera activa, cartera en riesgo, créditos en mora y solicitudes pendientes a la fecha de corte; la cartera por tramo de atraso, los cobros de los últimos seis meses, las solicitudes por estado y la cartera y el riesgo de cada asesor.",
      "Cartera en mora y cartera en riesgo no son lo mismo: la primera es todo el saldo con algún atraso; la segunda, el saldo con más de 30 días de atraso más los créditos reestructurados.",
    ],
    enlace: { texto: "Ir al tablero", a: "/gerencia/tablero" },
  },
  {
    id: "gerencia-fecha",
    roles: ["gerencia"],
    pregunta: "¿Qué es la fecha de corte?",
    respuesta: [
      "Es la fecha a la que se calcula todo lo que ves. Por defecto es hoy. Puedes elegir otra en la barra superior, o tocar Hoy o Cierre del paquete (31/10/2026) para volver a un punto conocido.",
      "Los clientes y asesores siempre operan con la fecha de hoy.",
    ],
  },
  {
    id: "gerencia-cierres",
    roles: ["gerencia"],
    pregunta: "¿Cómo funcionan los cierres?",
    respuesta: ["El cierre diario o mensual calcula desembolsos, recuperaciones por concepto y cartera a la fecha de corte. Es repetible: ejecutarlo otra vez recalcula el mismo resultado sin duplicar nada."],
    enlace: { texto: "Ir a Cierres", a: "/gerencia/cierre" },
  },
  {
    id: "gerencia-bitacora",
    roles: ["gerencia"],
    pregunta: "¿Qué registra la bitácora?",
    respuesta: ["Quién hizo qué y cuándo: altas de cuentas y clientes, solicitudes, aprobaciones, desembolsos, pagos y cierres, con el nombre y el rol de cada persona. Sirve para controlar la actividad de usuarios y asesores."],
    enlace: { texto: "Abrir la bitácora", a: "/gerencia/bitacora" },
  },
  {
    id: "gerencia-asistente",
    roles: ["gerencia"],
    pregunta: "¿Cómo uso el asistente?",
    respuesta: ["Toca Asistente en la barra superior: se abre un panel a la derecha. Ciérralo con la X, con el botón Cerrar o con la tecla Esc. Si el asistente no responde, el resto de la aplicación sigue funcionando."],
  },
  {
    id: "cuenta",
    roles: ["cliente", "asesor", "gerencia"],
    pregunta: "¿Dónde veo mis datos y cómo cierro sesión?",
    respuesta: ["En Mi cuenta (el ícono de persona arriba) ves tu nombre, tu tipo de cuenta, tu correo o teléfono y, si aplica, tu asesor. Ahí mismo está Cerrar sesión. En un celular compartido, cierra siempre tu sesión al terminar."],
    enlace: { texto: "Ir a Mi cuenta", a: "/cuenta" },
  },
  {
    id: "contacto",
    roles: ["cliente"],
    pregunta: "Sigo con dudas",
    respuesta: ["Habla con tu asesor de campo o acércate a una agencia de Crédito Vecino. Ten a la mano el número de tu crédito (lo ves en Créditos)."],
  },
];

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Módulo de ayuda: preguntas frecuentes por rol, plegables, con buscador local y enlaces contextuales (/ayuda#seccion). */
export default function Ayuda() {
  const { usuario } = useSesion();
  const { hash } = useLocation();
  const rol: Rol = usuario?.rol ?? "cliente";
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const temas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return TEMAS.filter((t) => t.roles.includes(rol)).filter((t) => !q || normalizar(`${t.pregunta} ${t.respuesta.join(" ")}`).includes(q));
  }, [rol, busqueda]);

  useEffect(() => {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id || !TEMAS.some((t) => t.id === id && t.roles.includes(rol))) return;
    setAbierto(id);
    window.setTimeout(() => document.getElementById(`tema-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, [hash, rol]);

  const contenido = (
    <>
      <label className="relative mb-4 block">
        <span className="sr-only">Buscar en la ayuda</span>
        <Icono nombre="buscar" tamano={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta/40" />
        <input className="campo min-h-[48px] !pl-10" type="search" placeholder="Busca: mora, cuota, pagar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </label>

      {temas.length === 0 ? (
        <EstadoVacio icono="buscar" titulo="No encontramos esa palabra" texto="Prueba con otra, por ejemplo “mora”, “cuota” o “saldo”.">
          <button className="boton-secundario" onClick={() => setBusqueda("")}>Ver todas las preguntas</button>
        </EstadoVacio>
      ) : (
        <div className="flex flex-col gap-2">
          {temas.map((t) => {
            const esta = abierto === t.id || (busqueda.trim() !== "" && temas.length <= 3);
            return (
              <section key={t.id + t.pregunta} id={`tema-${t.id}`} className="scroll-mt-20 rounded-tarjeta border border-linea bg-white">
                <h2>
                  <button
                    type="button"
                    aria-expanded={esta}
                    aria-controls={`resp-${t.id}`}
                    onClick={() => setAbierto(abierto === t.id ? null : t.id)}
                    className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left font-display text-[15px] font-semibold"
                  >
                    {t.pregunta}
                    <Icono nombre="chevron" tamano={20} className={`shrink-0 transition-transform ${esta ? "rotate-180" : ""}`} />
                  </button>
                </h2>
                {esta && (
                  <div id={`resp-${t.id}`} className="flex flex-col gap-2 border-t border-linea px-4 py-3 text-sm leading-relaxed text-tinta/80">
                    {t.respuesta.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                    {t.enlace && (
                      <Link to={t.enlace.a} className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-navy underline underline-offset-4">
                        {t.enlace.texto} <Icono nombre="flecha" tamano={16} />
                      </Link>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div>
      <EncabezadoPantalla titulo="Ayuda" subtitulo="Respuestas rápidas, en palabras simples" conRegreso volverA={rol === "gerencia" ? "/gerencia/tablero" : "/menu"} />
      <div className={rol === "gerencia" ? "max-w-2xl" : "px-4 py-4"}>{contenido}</div>
    </div>
  );
}
