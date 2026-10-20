import { Link, useNavigate } from "react-router-dom";
import Alerta from "../componentes/Alerta";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import { Esqueleto } from "../componentes/Esqueleto";
import Icono from "../componentes/Icono";
import Insignia from "../componentes/Insignia";
import { useSesion } from "../contexto/SesionContext";
import { useToast } from "../contexto/ToastContext";
import { api } from "../lib/api";
import { ETIQUETA_ROL } from "../lib/dinero";
import { fechaCorta } from "../lib/fecha";
import type { FilaCredito, MiPerfil } from "../lib/tipos";
import { useCarga } from "../lib/useCarga";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-sm text-tinta/60">{etiqueta}</span>
      <span className="text-right text-sm font-medium">{valor}</span>
    </div>
  );
}

/** Pantalla "Mi cuenta": datos reales de la persona, asesor asignado y cierre de sesión. */
export default function MiCuenta() {
  const { usuario, cerrar } = useSesion();
  const toast = useToast();
  const navegar = useNavigate();
  const perfil = useCarga(() => api.get<MiPerfil>("/mi-perfil"), [usuario?.id, usuario?.clienteId]);
  // El asesor de un cliente se conoce por sus créditos (la API de asesores es sólo para asesor/gerencia).
  const creditos = useCarga(async () => (usuario?.rol === "cliente" ? api.get<FilaCredito[]>("/creditos") : []), [usuario?.id, usuario?.rol]);

  if (!usuario) return null;
  const esCorreo = usuario.identificador.includes("@");
  const asesoresDelCliente = Array.from(new Set((creditos.datos ?? []).map((c) => c.asesorNombre).filter((n): n is string => !!n)));
  const cliente = perfil.datos?.cliente ?? null;
  const volverA = usuario.rol === "gerencia" ? "/gerencia/tablero" : "/menu";

  function salir() {
    cerrar();
    toast.mostrar("Cerraste tu sesión.", "info");
    navegar("/login", { replace: true });
  }

  return (
    <div>
      <EncabezadoPantalla titulo="Mi cuenta" conRegreso volverA={volverA} />
      <div className={`flex flex-col gap-4 ${usuario.rol === "gerencia" ? "max-w-xl" : "px-4 py-4"}`}>
        <div className="tarjeta flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy font-display text-xl font-semibold text-white" aria-hidden="true">
            {usuario.nombre.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{usuario.nombre}</p>
            <Insignia valor={usuario.rol}>{ETIQUETA_ROL[usuario.rol]}</Insignia>
          </div>
        </div>

        <div className="tarjeta divide-y divide-linea !p-0">
          <Dato etiqueta={esCorreo ? "Correo" : "Teléfono"} valor={usuario.identificador} />
          {usuario.rol === "cliente" && (
            <>
              {perfil.cargando && !perfil.datos ? (
                <div className="p-4"><Esqueleto className="h-4 w-2/3" /></div>
              ) : cliente ? (
                <>
                  <Dato etiqueta="Código de cliente" valor={cliente.id} />
                  <Dato etiqueta="DPI" valor={`•••• ${cliente.dpi.slice(-4)}`} />
                  {cliente.telefono && <Dato etiqueta="Teléfono de contacto" valor={cliente.telefono} />}
                  {cliente.municipio && <Dato etiqueta="Municipio" valor={cliente.municipio} />}
                  <Dato etiqueta="Cliente desde" valor={fechaCorta(cliente.fechaAlta)} />
                </>
              ) : (
                <Dato etiqueta="Ficha de cliente" valor="Aún no la completas" />
              )}
              <Dato etiqueta="Tu asesor" valor={asesoresDelCliente.length ? asesoresDelCliente.join(", ") : "Aún no tienes un asesor asignado"} />
            </>
          )}
          {usuario.rol === "asesor" && <Dato etiqueta="Código de asesor" valor={usuario.asesorId ?? "—"} />}
        </div>

        {perfil.error && <Alerta onReintentar={perfil.recargar}>{perfil.error}</Alerta>}

        {usuario.rol === "cliente" && !cliente && !perfil.cargando && (
          <Alerta tono="info" titulo="Completa tu ficha al pedir tu primer crédito">
            Cuando solicites un crédito te pediremos tu DPI y tus datos de contacto una sola vez.{" "}
            <Link to="/solicitud" className="font-semibold underline">Solicitar un crédito</Link>
          </Alerta>
        )}

        <Link to="/ayuda#cuenta" className="boton-secundario">
          <Icono nombre="ayuda" tamano={20} /> Ayuda con mi cuenta
        </Link>
        <button className="boton-cta" onClick={salir}>
          <Icono nombre="salir" tamano={20} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
