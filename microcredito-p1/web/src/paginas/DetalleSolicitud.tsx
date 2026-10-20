import { useParams } from "react-router-dom";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import PanelSolicitud from "../componentes/PanelSolicitud";

/** Seguimiento de una solicitud (móvil): estado real y, para el asesor, desembolso cuando está aprobada. */
export default function DetalleSolicitud() {
  const { id = "" } = useParams();
  return (
    <div>
      <EncabezadoPantalla titulo="Mi solicitud" subtitulo={id} conRegreso volverA="/menu" />
      <div className="px-4 py-5">
        <PanelSolicitud id={id} />
      </div>
    </div>
  );
}
