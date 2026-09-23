const CLAVE = "sgmc-solicitudes";
export function obtenerSolicitudes() {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? JSON.parse(crudo) : [];
}
export function guardarSolicitud(solicitud) {
    const actuales = obtenerSolicitudes();
    actuales.push(solicitud);
    localStorage.setItem(CLAVE, JSON.stringify(actuales));
}
export function actualizarEstadoSolicitud(id, nuevoEstado) {
    const actuales = obtenerSolicitudes();
    const actualizadas = actuales.map((s) => (s.id === id ? { ...s, estado: nuevoEstado } : s));
    localStorage.setItem(CLAVE, JSON.stringify(actualizadas));
}
export function generarIdSolicitud() {
    const año = new Date().getFullYear();
    const aleatorio = Math.floor(1000 + Math.random() * 9000);
    return `CV-${año}-${aleatorio}`;
}
