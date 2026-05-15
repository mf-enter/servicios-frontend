import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function Services() {
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [statusId, setStatusId] = useState("");

  const load = async () => {
    const params = {};
    if (statusId) params.status_id = statusId;
    const res = await api.get("/services/live", { params });
    setServices(res.data.data);
  };

  useEffect(() => {
    api.get("/workers").then(r => setWorkers(r.data.data));
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [statusId]);

  const assignWorker = async (serviceId, workerId) => {
    await api.patch(`/services/${serviceId}/assign-worker`, { worker_id: workerId });
    load();
  };

  return (
    <div>
      <h2 className="section-title">Servicios contratados</h2>
      <div className="mb-3">
        <input className="form-control" placeholder="Filtrar por estado (ID)" value={statusId} onChange={e=>setStatusId(e.target.value)} />
      </div>

      <table className="table table-bordered bg-white">
        <thead>
          <tr>
            <th>ID</th><th>Cliente</th><th>Trabajador</th>
            <th>Estado</th><th>Pago</th><th>Asignar</th>
          </tr>
        </thead>
        <tbody>
          {services.map(s => (
            <tr key={s.service_id}>
              <td>{s.service_id}</td>
              <td>{s.client_name}</td>
              <td>{s.worker_name || "Sin asignar"}</td>
              <td>{s.status_name}</td>
              <td>{s.payment_status || "Pendiente"}</td>
              <td>
                <select onChange={(e)=>assignWorker(s.service_id, e.target.value)} defaultValue="">
                  <option value="">Asignar</option>
                  {workers.map(w => (
                    <option key={w.worker_id ?? w.user_id} value={w.worker_id ?? w.user_id}>
                      {w.name} {w.lastname}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}