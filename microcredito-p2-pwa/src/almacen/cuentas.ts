export type Rol = "ASESOR" | "CLIENTE" | "GERENCIA";

export interface Cuenta {
  nombre: string;
  clave: string; // Demo local: no usar este mecanismo como autenticación real.
  rol: Rol;
}

const CLAVE_CUENTAS = "sgmc-cuentas";
const CLAVE_SESION = "sgmc-sesion";
const ROLES_VALIDOS: readonly Rol[] = ["ASESOR", "CLIENTE", "GERENCIA"];

function leerJson<T>(clave: string, valorPorDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave);
    if (!crudo) return valorPorDefecto;
    const valor = JSON.parse(crudo) as T;
    return valor ?? valorPorDefecto;
  } catch {
    return valorPorDefecto;
  }
}

function obtenerCuentas(): Cuenta[] {
  const cuentas = leerJson<unknown>(CLAVE_CUENTAS, []);
  if (!Array.isArray(cuentas)) return [];

  return cuentas.filter((c): c is Cuenta =>
    typeof c === "object" &&
    c !== null &&
    typeof (c as Cuenta).nombre === "string" &&
    typeof (c as Cuenta).clave === "string" &&
    ROLES_VALIDOS.includes((c as Cuenta).rol)
  );
}

function validarCredenciales(nombre: string, clave: string): string | null {
  if (nombre.length < 3) return "El nombre de usuario debe tener al menos 3 caracteres.";
  if (nombre.length > 50) return "El nombre de usuario no puede superar 50 caracteres.";
  if (!/^[\p{L}\p{N}._ -]+$/u.test(nombre)) {
    return "El nombre de usuario contiene caracteres no permitidos.";
  }
  if (clave.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  if (clave.length > 100) return "La contraseña no puede superar 100 caracteres.";
  return null;
}

export function crearCuenta(nombre: string, clave: string, rol: Rol): { exito: boolean; mensaje?: string } {
  const nombreNormalizado = nombre.trim();
  const error = validarCredenciales(nombreNormalizado, clave);
  if (error) return { exito: false, mensaje: error };

  if (!ROLES_VALIDOS.includes(rol)) {
    return { exito: false, mensaje: "El tipo de cuenta seleccionado no es válido." };
  }

  const cuentas = obtenerCuentas();
  if (cuentas.some((c) => c.nombre.toLocaleLowerCase() === nombreNormalizado.toLocaleLowerCase())) {
    return { exito: false, mensaje: "Ya existe una cuenta con ese nombre." };
  }

  cuentas.push({ nombre: nombreNormalizado, clave, rol });
  localStorage.setItem(CLAVE_CUENTAS, JSON.stringify(cuentas));
  return { exito: true };
}

export function iniciarSesion(nombre: string, clave: string): { exito: boolean; mensaje?: string } {
  const nombreNormalizado = nombre.trim();
  if (!nombreNormalizado || !clave) {
    return { exito: false, mensaje: "Ingresa tu nombre de usuario y contraseña." };
  }

  const cuenta = obtenerCuentas().find(
    (c) => c.nombre.toLocaleLowerCase() === nombreNormalizado.toLocaleLowerCase() && c.clave === clave
  );

  if (!cuenta) {
    return { exito: false, mensaje: "Nombre de usuario o contraseña incorrectos." };
  }

  sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ nombre: cuenta.nombre, rol: cuenta.rol }));
  return { exito: true };
}

export interface Sesion {
  nombre: string;
  rol: Rol;
}

export function obtenerSesion(): Sesion | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_SESION);
    if (!crudo) return null;

    const sesion = JSON.parse(crudo) as Partial<Sesion>;
    if (typeof sesion.nombre !== "string" || !ROLES_VALIDOS.includes(sesion.rol as Rol)) {
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }

    return { nombre: sesion.nombre, rol: sesion.rol as Rol };
  } catch {
    sessionStorage.removeItem(CLAVE_SESION);
    return null;
  }
}

export function cerrarSesion(): void {
  sessionStorage.removeItem(CLAVE_SESION);
}
