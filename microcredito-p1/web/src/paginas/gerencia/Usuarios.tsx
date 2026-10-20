import Alerta from "../../componentes/Alerta";
import { EsqueletoLista } from "../../componentes/Esqueleto";
import Insignia from "../../componentes/Insignia";
import TablaDatos, { type Columna } from "../../componentes/TablaDatos";
import { api } from "../../lib/api";
import { ETIQUETA_ROL } from "../../lib/dinero";
import { fechaHora } from "../../lib/fecha";
import type { FilaUsuario } from "../../lib/tipos";
import { useCarga } from "../../lib/useCarga";

/** Listado de usuarios con su rol y último acceso. */
export default function Usuarios() {
  const { datos, error, cargando, recargar } = useCarga(() => api.get<FilaUsuario[]>("/gerencia/usuarios"), []);

  const columnas: Columna<FilaUsuario>[] = [
    { clave: "nombre", titulo: "Nombre", render: (u) => <span className="font-medium">{u.nombre}</span>, valor: (u) => u.nombre },
    { clave: "identificador", titulo: "Correo o teléfono", render: (u) => <span className="cifra">{u.identificador}</span>, valor: (u) => u.identificador },
    { clave: "rol", titulo: "Rol", render: (u) => <Insignia valor={u.rol}>{ETIQUETA_ROL[u.rol]}</Insignia>, valor: (u) => u.rol },
    { clave: "creado", titulo: "Cuenta creada", render: (u) => fechaHora(u.creadoEn), valor: (u) => u.creadoEn },
    { clave: "acceso", titulo: "Último acceso", render: (u) => (u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : <span className="text-tinta/45">Nunca</span>), valor: (u) => u.ultimoAcceso ?? "" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-tinta/60">Cuentas registradas en CrediGest.</p>
      </div>
      {error && <Alerta onReintentar={recargar}>{error}</Alerta>}
      {cargando && !datos && <EsqueletoLista filas={3} />}
      {datos && <TablaDatos filas={datos} columnas={columnas} idFila={(u) => u.id} textoBusqueda={(u) => `${u.nombre} ${u.identificador} ${u.rol}`} placeholderBusqueda="Buscar por nombre o correo" vacio="No hay usuarios." />}
    </div>
  );
}
