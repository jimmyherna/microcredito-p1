export type Rol = "ASESOR" | "CLIENTE" | "GERENCIA";

export interface Cuenta {
  nombre: string;
  clave: string; // demo local, sin cifrado — no hay backend real todavía
  rol: Rol;
}

const CLAVE_CUENTAS = "sgmc-cuentas";
const CLAVE_SESION = "sgmc-sesion";

function obtenerCuentas(): Cuenta[] {
  const crudo = localStorage.getItem(CLAVE_CUENTAS);
  return crudo ? (JSON.parse(crudo) as Cuenta[]) : [];
}

export function crearCuenta(nombre: string, clave: string, rol: Rol): { exito: boolean; mensaje?: string } {
  const cuentas = obtenerCuentas();
  if (cuentas.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
    return { exito: false, mensaje: "Ya existe una cuenta con ese nombre." };
  }
  cuentas.push({ nombre, clave, rol });
  localStorage.setItem(CLAVE_CUENTAS, JSON.stringify(cuentas));
  return { exito: true };
}

export function iniciarSesion(nombre: string, clave: string): { exito: boolean; mensaje?: string } {
  const cuenta = obtenerCuentas().find(
    (c) => c.nombre.toLowerCase() === nombre.toLowerCase() && c.clave === clave
  );
  if (!cuenta) {
    return { exito: false, mensaje: "Nombre o contraseña incorrectos." };
  }
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ nombre: cuenta.nombre, rol: cuenta.rol }));
  return { exito: true };
}

export interface Sesion { nombre: string; rol: Rol }

export function obtenerSesion(): Sesion | null {
  const crudo = sessionStorage.getItem(CLAVE_SESION);
  return crudo ? (JSON.parse(crudo) as Sesion) : null;
}

export function cerrarSesion(): void {
  sessionStorage.removeItem(CLAVE_SESION);
}