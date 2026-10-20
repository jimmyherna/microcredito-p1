import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Alerta from "../componentes/Alerta";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import EstadoVacio from "../componentes/EstadoVacio";
import { EsqueletoLista } from "../componentes/Esqueleto";
import Icono from "../componentes/Icono";
import { TarjetaCredito, TarjetaSolicitud, yaDesembolsada } from "../componentes/TarjetasLista";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useSesion } from "../contexto/SesionContext";
import { api } from "../lib/api";
import { formatearDinero, formatearPorcentaje, primerNombre } from "../lib/dinero";
import { fechaLarga } from "../lib/fecha";
import type { CarteraEnRiesgo, FilaCredito, SolicitudConCliente, Vencimientos } from "../lib/tipos";
import { useCarga } from "../lib/useCarga";

interface DatosMenu {
  creditos: FilaCredito[];
  solicitudes: SolicitudConCliente[];
  cartera: CarteraEnRiesgo | null;
  vencimientos: Vencimientos | null;
}

function Seccion({ titulo, enlace, children }: { titulo: string; enlace?: { texto: string; a: string }; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">{titulo}</h2>
        {enlace && (
          <Link to={enlace.a} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-navy">
            {enlace.texto}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Inicio de cliente y asesor: saludo con el nombre real y sólo datos del propio usuario. */
export default function MenuPrincipal() {
  const { usuario } = useSesion();
  const { fecha, conFecha } = useFechaOperacion();
  const esAsesor = usuario?.rol === "asesor";

  const { datos, error, cargando, recargar } = useCarga<DatosMenu>(async () => {
    const [creditos, solicitudes, cartera, vencimientos] = await Promise.all([
      api.get<FilaCredito[]>(conFecha("/creditos")),
      api.get<SolicitudConCliente[]>("/solicitudes"),
      esAsesor ? api.get<CarteraEnRiesgo>(conFecha("/cartera/en-riesgo")) : Promise.resolve(null),
      esAsesor ? api.get<Vencimientos>(conFecha("/vencimientos?dias=7")) : Promise.resolve(null),
    ]);
    return { creditos, solicitudes, cartera, vencimientos };
  }, [fecha, esAsesor]);

  const nombre = primerNombre(usuario?.nombre);
  const creditos = datos?.creditos ?? [];
  const solicitudes = (datos?.solicitudes ?? []).filter((s) => !yaDesembolsada(s, creditos)).slice().reverse();
  const enAtraso = creditos.filter((c) => c.diasDeAtraso > 0);

  return (
    <div>
      <EncabezadoPantalla titulo={nombre ? `Hola, ${nombre}` : "Hola"} subtitulo={fechaLarga(fecha)} />
      <div className="flex flex-col gap-6 px-4 py-5">
        <p className="-mb-3 text-tinta/70">{esAsesor ? "¿Qué vas a hacer hoy en campo?" : "¿Qué quieres hacer hoy?"}</p>

        {esAsesor ? (
          <div className="grid grid-cols-1 gap-3">
            <Link to="/creditos?modo=cobro" className="boton-menu">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><Icono nombre="pago" /></span>
              Cobrar a un cliente
            </Link>
            <Link to="/solicitud" className="boton-menu">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><Icono nombre="solicitud" /></span>
              Solicitud de crédito para un cliente
            </Link>
          </div>
        ) : (
          <Link to="/solicitud" className="boton-menu">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><Icono nombre="solicitud" /></span>
            Solicitar un crédito
          </Link>
        )}

        {cargando && !datos && <EsqueletoLista filas={2} />}
        {error && <Alerta onReintentar={recargar}>{error}</Alerta>}

        {datos && esAsesor && datos.cartera && (
          <Seccion titulo="Tu cartera hoy">
            <div className="grid grid-cols-2 gap-3">
              <div className="tarjeta">
                <p className="etiqueta">Cartera activa</p>
                <p className="cifra text-lg font-semibold text-navy">{formatearDinero(datos.cartera.carteraActiva)}</p>
              </div>
              <div className="tarjeta">
                <p className="etiqueta">En riesgo</p>
                <p className="cifra text-lg font-semibold text-mora">{formatearDinero(datos.cartera.carteraEnRiesgo)}</p>
                <p className="text-xs text-tinta/55">{formatearPorcentaje(datos.cartera.porcentaje)} de tu cartera</p>
              </div>
            </div>
            {datos.vencimientos && (
              <div className="tarjeta flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Vencen en los próximos 7 días</p>
                  <p className="text-xs text-tinta/55">{datos.vencimientos.totalCuotas === 1 ? "1 cuota" : `${datos.vencimientos.totalCuotas} cuotas`}</p>
                </div>
                <p className="cifra text-base font-semibold">{formatearDinero(datos.vencimientos.montoTotal)}</p>
              </div>
            )}
          </Seccion>
        )}

        {datos && esAsesor && enAtraso.length > 0 && (
          <Seccion titulo="Clientes con atraso" enlace={{ texto: "Ver cartera", a: "/creditos" }}>
            {enAtraso.slice(0, 4).map((c) => (
              <TarjetaCredito key={c.id} credito={c} a={`/credito/${c.id}`} mostrarCliente />
            ))}
          </Seccion>
        )}

        {datos && creditos.length === 0 && solicitudes.length === 0 && (
          <EstadoVacio
            icono="credito"
            titulo={esAsesor ? "Aún no tienes clientes en tu cartera" : "Aún no tienes créditos"}
            texto={esAsesor ? "Cuando registres una solicitud para un cliente y se desembolse, aparecerá aquí." : "Cuando pidas y recibas un crédito, aquí verás cuánto debes y cuándo pagar."}
          >
            <Link to="/solicitud" className="boton-primario">
              {esAsesor ? "Registrar la primera solicitud" : "Solicitar mi primer crédito"}
            </Link>
          </EstadoVacio>
        )}

        {datos && !esAsesor && creditos.length > 0 && (
          <Seccion titulo="Mis créditos" enlace={creditos.length > 3 ? { texto: "Ver todos", a: "/creditos" } : undefined}>
            {creditos.slice(0, 3).map((c) => (
              <TarjetaCredito key={c.id} credito={c} a={`/credito/${c.id}`} />
            ))}
          </Seccion>
        )}

        {datos && solicitudes.length > 0 && (
          <Seccion titulo={esAsesor ? "Solicitudes de tus clientes" : "Mis solicitudes"}>
            {solicitudes.slice(0, 4).map((s) => (
              <TarjetaSolicitud key={s.id} solicitud={s} mostrarCliente={esAsesor} />
            ))}
          </Seccion>
        )}

        {datos && !esAsesor && creditos.length === 0 && solicitudes.length > 0 && <Alerta tono="info">Todavía no tienes créditos activos. Cuando se apruebe y desembolse tu solicitud, lo verás aquí.</Alerta>}
      </div>
    </div>
  );
}
