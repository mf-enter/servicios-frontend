import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/admin/notifications").then(r => setLogs(r.data.data));
  }, []);

  return (
    <div>
      <h2 className="section-title mb-3">Notificaciones</h2>
      <div className="card shadow-sm">
        <div className="card-body">
          <ul className="mb-0">
            {logs.map(l => (
              <li key={l.log_id}>
                {l.action} - {l.entity_type} #{l.entity_id}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}