import { useEffect, useState, useMemo } from "react";
import api from "../../api/axios";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    api.get("/admin/notifications")
      .then(r => {
        setLogs((r.data?.data || []).sort((a, b) => {
          const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
          const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
          return timeB - timeA;
        }));
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action));
    return Array.from(actions).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchesAction = actionFilter === "all" || l.action === actionFilter;
      const matchesSearch = searchFilter === "" || 
        String(l.entity_id || "").includes(searchFilter) ||
        String(l.entity_type || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
        String(l.action || "").toLowerCase().includes(searchFilter.toLowerCase());
      return matchesAction && matchesSearch;
    });
  }, [logs, actionFilter, searchFilter]);

  const getActionBadgeColor = (action) => {
    const lower = String(action || "").toLowerCase();
    if (lower.includes("create")) return "bg-success";
    if (lower.includes("update")) return "bg-info";
    if (lower.includes("delete")) return "bg-danger";
    if (lower.includes("cancel")) return "bg-warning text-dark";
    return "bg-secondary";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="section-title mb-1">📋 Registro de Actividades</h2>
          <p className="text-muted mb-0">Historial de cambios y eventos del sistema</p>
        </div>
        <div className="badge bg-light text-dark fs-6">Total: {logs.length}</div>
      </div>

      {loading ? (
        <div className="alert alert-info">Cargando registros...</div>
      ) : logs.length === 0 ? (
        <div className="alert alert-warning">No hay registros disponibles</div>
      ) : (
        <>
          <div className="card shadow-sm mb-3 border-0">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por ID, entidad o acción..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <select
                    className="form-select"
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                  >
                    <option value="all">Todos los tipos de acción</option>
                    {uniqueActions.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body">
              {filteredLogs.length === 0 ? (
                <div className="alert alert-info mb-0">No hay registros que coincidan con los filtros</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{width: "25%"}}>Acción</th>
                        <th style={{width: "20%"}}>Tipo de Entidad</th>
                        <th style={{width: "15%"}}>ID Entidad</th>
                        <th style={{width: "25%"}}>Fecha y Hora</th>
                        <th style={{width: "15%"}}>Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(l => (
                        <tr key={`${l.log_id}-${l.timestamp}`}>
                          <td>
                            <span className={`badge ${getActionBadgeColor(l.action)}`}>
                              {l.action || "N/A"}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">{l.entity_type || "N/A"}</span>
                          </td>
                          <td className="fw-semibold">#{l.entity_id || "-"}</td>
                          <td className="small">{formatDate(l.created_at || l.timestamp)}</td>
                          <td className="small text-muted">{l.user_id || l.admin_id || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-center text-muted small">
            Mostrando {filteredLogs.length} de {logs.length} registros
          </div>
        </>
      )}
    </div>
  );
}