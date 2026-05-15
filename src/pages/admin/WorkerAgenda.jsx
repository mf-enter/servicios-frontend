import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function WorkerAgenda() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/admin/worker-agenda").then(r => setData(r.data.data));
  }, []);

  return (
    <div>
      <h2 className="section-title mb-3">Agenda / Historial de Trabajadores</h2>
      <table className="table table-bordered bg-white">
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Servicio</th>
            <th>Estado</th>
            <th>Pago</th>
            <th>Inicio</th>
            <th>Fin</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={`${r.worker_id ?? r.user_id}-${r.service_id ?? r.serviceId ?? r.id}`}>
              <td>{r.name}</td>
              <td>#{r.service_id}</td>
              <td>{r.status_name}</td>
              <td>{r.payment_status || "N/A"}</td>
              <td>{r.started_at || "-"}</td>
              <td>{r.finished_at || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}