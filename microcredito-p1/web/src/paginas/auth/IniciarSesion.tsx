import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import Alerta from "../../componentes/Alerta";
import Campo from "../../componentes/Campo";
import Icono from "../../componentes/Icono";
import PlantillaAuth from "../../componentes/PlantillaAuth";
import { inicioDeRol, useSesion } from "../../contexto/SesionContext";
import { api, ErrorApi, mensajeError } from "../../lib/api";
import type { RespuestaSesion } from "../../lib/tipos";

export default function IniciarSesion() {
  const { usuario, iniciar, aviso, limpiarAviso, validando } = useSesion();
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [ver, setVer] = useState(false);
  const [tocado, setTocado] = useState({ id: false, pw: false });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario && !validando) return <Navigate to={inicioDeRol(usuario.rol)} replace />;

  const errId = tocado.id && !identificador.trim() ? "Escribe tu correo o tu teléfono." : null;
  const errPw = tocado.pw && !contrasena ? "Escribe tu contraseña." : null;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTocado({ id: true, pw: true });
    if (!identificador.trim() || !contrasena) return;
    setEnviando(true);
    setError(null);
    limpiarAviso();
    try {
      const r = await api.post<RespuestaSesion>("/auth/login", { identificador: identificador.trim(), contrasena });
      iniciar(r); // el redireccionamiento por rol lo hace el <Navigate> de arriba
    } catch (err) {
      setError(
        err instanceof ErrorApi && err.codigo === "CREDENCIALES_INVALIDAS"
          ? "El correo/teléfono o la contraseña no son correctos. Revísalos e inténtalo de nuevo."
          : mensajeError(err, "No pudimos iniciar tu sesión. Inténtalo de nuevo.")
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PlantillaAuth
      titulo="Iniciar sesión"
      subtitulo="Entra con tu correo o tu teléfono."
      pie={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link to="/registro" className="font-semibold text-navy underline underline-offset-4">
            Crea una
          </Link>
        </>
      }
    >
      {aviso && <Alerta tono="aviso">{aviso}</Alerta>}
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Campo etiqueta="Correo o teléfono" valor={identificador} onCambio={setIdentificador} onBlur={() => setTocado((t) => ({ ...t, id: true }))} error={errId} autoComplete="username" inputMode="email" autoCapitalize="none" autoFocus />
        <Campo
          etiqueta="Contraseña"
          type={ver ? "text" : "password"}
          valor={contrasena}
          onCambio={setContrasena}
          onBlur={() => setTocado((t) => ({ ...t, pw: true }))}
          error={errPw}
          autoComplete="current-password"
          derecha={
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={ver} className="boton-icono !h-10 !w-10">
              <Icono nombre={ver ? "ojo-cerrado" : "ojo"} tamano={20} />
            </button>
          }
        />
        {error && <Alerta>{error}</Alerta>}
        <button className="boton-primario" type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Ingresar"}
        </button>
      </form>
    </PlantillaAuth>
  );
}
