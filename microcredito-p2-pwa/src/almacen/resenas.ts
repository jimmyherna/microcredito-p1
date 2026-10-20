export interface Resena {
  nombre: string;
  rol: string;
  estrellas: number;
  comentario: string;
  fecha: string;
}

const CLAVE = "sgmc-resenas";

export function obtenerResenas(): Resena[] {
  const crudo = localStorage.getItem(CLAVE);
  return crudo ? (JSON.parse(crudo) as Resena[]) : [];
}

export function guardarResena(resena: Resena): void {
  const actuales = obtenerResenas();
  actuales.push(resena);
  localStorage.setItem(CLAVE, JSON.stringify(actuales));
}

export function calcularPromedio(): number {
  const resenas = obtenerResenas();
  if (resenas.length === 0) return 0;
  const suma = resenas.reduce((acc, r) => acc + r.estrellas, 0);
  return suma / resenas.length;
}