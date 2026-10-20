import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import Alerta from "../../componentes/Alerta";
import Campo from "../../componentes/Campo";
import Icono from "../../componentes/Icono";
import PlantillaAuth from "../../componentes/PlantillaAuth";
import { inicioDeRol, useSesion } from "../../contexto/SesionContext";
import { api, ErrorApi, mensajeError } from "../../lib/api";
import type { Asesor, RespuestaSesion, Rol } from "../../lib/tipos";

const NUEVO = "__nuevo__";

const ROLES: { valor: Rol; titulo: string; texto: string }[] = [
  { valor: "cliente", titulo: "Cliente", texto: "Quiero ver o pedir mis créditos" },
  { valor: "asesor", titulo: "Asesor de campo", texto: "Atiendo clientes y cobros" },
  { valor: "gerencia", titulo: "Comité gerencial", texto: "Superviso la cartera" },
];

function identificadorValido(v: string): boolean {
  const t = v.trim();
  if (t.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  return t.replace(/\D/g, "").length >= 8;
}

export default function Registrarte() {
  const { usuario, iniciar, validando } = useSesion();
  const [rol, setRol] = useState<Rol>("cliente");
  const [nombre, setNombre] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [ver, setVer] = useState(false);
  const [dpi, setDpi] = useState("");
  const [asesorId, setAsesorId] = useState(NUEVO);
  const [asesores, setAsesores] = useState<Asesor[] | null>(null);
  const [codigoComite, setCodigoComite] = useState("");
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (rol !== "asesor" || asesores) return;
    api
      .get<Asesor[]>("/auth/asesores-disponibles")
      .then(setAsesores)
      .catch(() => setAsesores([]));
  }, [rol, asesores]);

  if (usuario && !validando) return <Navigate to={inicioDeRol(usuario.rol)} replace />;

  const tocar = (k: string) => setTocado((t) => ({ ...t, [k]: true }));
  const errores: Record<string, string | null> = {
    nombre: nombre.trim().length < 2 ? "Escribe tu nombre completo." : null,
    identificador: !identificadorValido(identificador) ? "Escribe un correo válido o un teléfono de al menos 8 dígitos." : null,
    contrasena: contrasena.length < 8 ? "La contraseña debe tener al menos 8 caracteres." : null,
    confirmacion: confirmacion !== contrasena ? "Las contraseñas no coinciden." : null,
    codigo: rol === "gerencia" && !codigoComite.trim() ? "Escribe el código del comité." : null,
  };
  const ver_ = (k: string) => (tocado[k] ? errores[k] : null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTocado({ nombre: true, identificador: true, contrasena: true, confirmacion: true, codigo: true });
    if (Object.values(errores).some(Boolean)) return;
    setEnviando(true);
    setError(null);
    setDuplicado(false);
    try {
      const cuerpo: Record<string, string> = { nombre: nombre.trim(), identificador: identificador.trim(), contrasena, rol };
      if (rol === "cliente" && dpi.trim()) cuerpo["dpi"] = dpi.trim();
      if (rol === "asesor" && asesorId !== NUEVO) cuerpo["asesorId"] = asesorId;
      if (rol === "gerencia") cuerpo["codigoComite"] = codigoComite;
      const r = await api.post<RespuestaSesion>("/auth/registro", cuerpo);
      iniciar(r); // entra directo; el <Navigate> de arriba lleva a su inicio
    } catch (err) {
      if (err instanceof ErrorApi && err.codigo === "IDENTIFICADOR_DUPLICADO") setDuplicado(true);
      setError(mensajeError(err, "No pudimos crear tu cuenta. Inténtalo de nuevo."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PlantillaAuth
      titulo="Crear una cuenta"
      subtitulo="Te toma menos de un minuto."
      pie={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-semibold text-navy underline underline-offset-4">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Tipo de cuenta</legend>
          <div className="flex flex-col gap-2">
            {ROLES.map((r) => (
              <label key={r.valor} className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-tarjeta border px-4 py-2 transition ${rol === r.valor ? "border-navy bg-navy-claro" : "border-linea bg-white"}`}>
                <input type="radio" name="rol" value={r.valor} checked={rol === r.valor} onChange={() => setRol(r.valor)} className="h-4 w-4 accent-[#15304D]" />
                <span>
                  <span className="block text-sm font-semibold">{r.titulo}</span>
                  <span className="block text-xs text-tinta/60">{r.texto}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Campo etiqueta="Nombre completo" valor={nombre} onCambio={setNombre} onBlur={() => tocar("nombre")} error={ver_("nombre")} autoComplete="name" />
        <Campo etiqueta="Correo o teléfono" valor={identificador} onCambio={setIdentificador} onBlur={() => tocar("identificador")} error={ver_("identificador")} ayuda="Con él iniciarás sesión." autoComplete="username" inputMode="email" autoCapitalize="none" />

        {rol === "cliente" && (
          <Campo etiqueta="DPI" valor={dpi} onCambio={setDpi} opcional inputMode="numeric" ayuda="Si ya tienes un crédito con nosotros, ingresa tu DPI para vincularlo." />
        )}

        {rol === "asesor" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="asesor-elegido" className="text-sm font-medium">
              ¿Quién eres en la lista de asesores?
            </label>
            <select id="asesor-elegido" className="campo min-h-[48px]" value={asesorId} onChange={(e) => setAsesorId(e.target.value)}>
              <option value={NUEVO}>Soy un asesor nuevo</option>
              {(asesores ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-tinta/55">{asesores === null ? "Cargando la lista…" : "Elige tu nombre para ver tu cartera, o crea un perfil nuevo."}</p>
          </div>
        )}

        {rol === "gerencia" && <Campo etiqueta="Código del comité" valor={codigoComite} onCambio={setCodigoComite} onBlur={() => tocar("codigo")} error={ver_("codigo")} ayuda="Te lo entrega el comité gerencial." autoComplete="off" />}

        <Campo
          etiqueta="Contraseña"
          type={ver ? "text" : "password"}
          valor={contrasena}
          onCambio={setContrasena}
          onBlur={() => tocar("contrasena")}
          error={ver_("contrasena")}
          ayuda="Mínimo 8 caracteres."
          autoComplete="new-password"
          derecha={
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={ver} className="boton-icono !h-10 !w-10">
              <Icono nombre={ver ? "ojo-cerrado" : "ojo"} tamano={20} />
            </button>
          }
        />
        <Campo etiqueta="Confirma tu contraseña" type={ver ? "text" : "password"} valor={confirmacion} onCambio={setConfirmacion} onBlur={() => tocar("confirmacion")} error={ver_("confirmacion")} autoComplete="new-password" />

        {error && (
          <Alerta>
            {error}{" "}
            {duplicado && (
              <Link to="/login" className="font-semibold underline">
                Ir a iniciar sesión
              </Link>
            )}
          </Alerta>
        )}
        <button className="boton-primario" type="submit" disabled={enviando}>
          {enviando ? "Creando tu cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </PlantillaAuth>
  );
}
