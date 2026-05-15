import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";

export default function Account() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [requestedServices, setRequestedServices] = useState([]);
  const [historyServicesData, setHistoryServicesData] = useState([]);
  const [activeTab, setActiveTab] = useState("activos");
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getTokenRole = () => {
    try {
      if (!token) return "user";
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      return payload?.role || "user";
    } catch (error) {
      return "user";
    }
  };

  const fetchServices = async () => {
    const [requestedResult, historyResult] = await Promise.allSettled([
      api.get("/users/me/services"),
      api.get("/users/me/history"),
    ]);

    const requested = requestedResult.status === "fulfilled" ? listFromResponse(requestedResult.value) : [];
    const history = historyResult.status === "fulfilled" ? listFromResponse(historyResult.value) : [];

    if (requested.length === 0 && history.length === 0 && requestedResult.status === "rejected" && historyResult.status === "rejected") {
      throw requestedResult.reason || historyResult.reason;
    }

    return { requested, history };
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const role = getTokenRole();
    if (role === "worker") {
      navigate("/worker-panel", { replace: true });
      return;
    }
    if (role === "admin") {
      navigate("/dashboard", { replace: true });
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const servicesData = await fetchServices();
        setRequestedServices(servicesData.requested || []);
        setHistoryServicesData(servicesData.history || []);

        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUser({ user_id: payload.user_id, role: payload.role });
        } catch (decodeError) {
          console.error("Error decodificando token:", decodeError);
        }
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, navigate]);

  const refreshServices = async () => {
    const data = await fetchServices();
    setRequestedServices(data.requested || []);
    setHistoryServicesData(data.history || []);
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const requestCancelService = async (serviceId) => {
    if (!window.confirm("¿Seguro que deseas cancelar este servicio?")) return;

    setActionLoadingId(serviceId);
    setError("");
    setSuccess("");

    try {
      const svc = [...requestedServices, ...historyServicesData].find((s) => (s.service_id ?? s.id) === serviceId);
      const status = String(svc?.status_name ?? "").toLowerCase();
      if (status !== "pendiente") {
        setError("Solo se puede cancelar un servicio si está en estado Pendiente.");
        setActionLoadingId(null);
        return;
      }

      await api.patch(`/services/${serviceId}/cancel`);

      setSuccess(`Servicio #${serviceId} cancelado correctamente.`);
      await refreshServices();
    } catch (err) {
      if (err.response?.status === 409) {
        setError("El servicio no puede cancelarse en este estado.");
      } else if (err.response?.status === 403) {
        setError("No tienes permiso para cancelar este servicio.");
      } else if (err.response?.status === 404) {
        setError("El servicio no existe.");
      } else {
        setError(apiErrorMessage(err));
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const requestPayService = async (service) => {
    const serviceId = service.service_id;
    const amount = Number(service.estimated_price ?? service.amount ?? service.total_amount ?? 0);

    if (!window.confirm(`¿Confirmas pagar el servicio #${serviceId}?`)) return;

    setActionLoadingId(serviceId);
    setError("");
    setSuccess("");

    try {
      const status = String(service.status_name ?? service.status ?? "").toLowerCase();
      if (status !== "completado") {
        setError("Solo se puede pagar un servicio cuando su estado es Completado.");
        setActionLoadingId(null);
        return;
      }

      if (amount <= 0) {
        setError("El monto del servicio no está disponible. Por favor contacta soporte.");
        setActionLoadingId(null);
        return;
      }

      await api.post("/payments", {
        service_id: serviceId,
        amount: amount,
        transaction_reference: `WEB-${Date.now()}`,
      });

      setSuccess(`Pago aplicado para el servicio #${serviceId}.`);
      await refreshServices();
    } catch (err) {
      if (err.response?.status === 409) {
        setError("El servicio debe estar en estado Completado para realizar el pago.");
      } else if (err.response?.status === 400) {
        setError("Datos de pago inválidos. Verifica el monto y los datos del servicio.");
      } else if (err.response?.status === 404) {
        setError("El servicio no existe.");
      } else {
        setError(apiErrorMessage(err));
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusBadge = (statusName) => {
    if (statusName === "Completado") return "bg-success";
    if (statusName === "En progreso") return "bg-warning text-dark";
    if (statusName === "Cancelado") return "bg-danger";
    return "bg-secondary";
  };

  const paymentBadge = (paymentStatus) => {
    const normalized = String(paymentStatus ?? "").toLowerCase();
    if (normalized === "completado" || normalized === "paid") return "bg-success";
    if (normalized === "fallido" || normalized === "failed") return "bg-danger";
    return "bg-warning text-dark";
  };

  const fmtDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const normalizedServices = useMemo(() => {
    return requestedServices
      .slice()
      .sort((a, b) => new Date(b.created_at ?? b.requested_at ?? 0) - new Date(a.created_at ?? a.requested_at ?? 0));
  }, [requestedServices]);

  const activeServices = useMemo(() => {
    return normalizedServices.filter((s) => {
      return true;
    });
  }, [normalizedServices]);

  const historyServices = useMemo(() => {
    return historyServicesData;
  }, [historyServicesData]);

  const listToRender = activeTab === "activos" ? activeServices : historyServices;

  return (
    <div>
      <div className="row g-4">
        <div className="col-12 col-lg-3">
          <div className="card shadow-sm border-0 sticky-top" style={{ top: 20 }}>
            <div className="card-body text-center">
              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 80, height: 80 }}>
                👤
              </div>
              <h5 className="fw-bold">Mi Cuenta</h5>
              <p className="text-muted small">Usuario {user?.role === "admin" ? "Administrador" : user?.role === "worker" ? "Trabajador" : "Cliente"}</p>

              <div className="text-muted small mb-3">
                <p className="mb-1">ID: {user?.user_id}</p>
                <p className="mb-1">Activos: {activeServices.length}</p>
                <p className="mb-0">Historial: {historyServices.length}</p>
              </div>

              <div className="alert alert-light border text-start small mb-3">
                <strong>Permisos del cliente:</strong> ver el avance, el trabajador asignado, el domicilio, los pagos y cancelar solicitudes activas.
              </div>

              <button className="btn btn-sm btn-outline-danger w-100" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-9">
          <div>
            <h2 className="section-title mb-1">Mis Solicitudes y Servicios</h2>
            <p className="text-muted mb-3">Aquí ves el seguimiento de tus servicios, el trabajador asignado, los pagos y la opción de cancelar si sigue activo.</p>

            <div className="btn-group mb-4" role="group" aria-label="Tabs de servicios">
              <button
                type="button"
                className={`btn ${activeTab === "activos" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setActiveTab("activos")}
              >
                Activos ({activeServices.length})
              </button>
              <button
                type="button"
                className={`btn ${activeTab === "historial" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setActiveTab("historial")}
              >
                Historial ({historyServices.length})
              </button>
            </div>

            {loading ? <div className="alert alert-info">Cargando servicios...</div> : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}
            {success ? <div className="alert alert-success">{success}</div> : null}

            {!loading && listToRender.length === 0 ? (
              <div className="alert alert-warning">
                <p className="mb-0">No hay servicios en esta sección.</p>
                <small><a href="/trabajadores" className="alert-link">Explora trabajadores →</a></small>
              </div>
            ) : null}

            <div className="row g-3">
              {listToRender.map((service) => {
                const id = service.service_id;
                const isExpanded = expandedServiceId === id;
                const statusLower = String(service.status_name ?? service.status ?? "").toLowerCase();
                const isCompleted = statusLower === "completado";
                const isCanceled = statusLower === "cancelado";
                const paymentDone = String(service.payment_status ?? "").toLowerCase() === "completado";

                return (
                  <div key={id} className="col-12">
                    <div className="card shadow-sm border-0">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                          <div>
                            <h5 className="fw-bold mb-1">Servicio #{id}</h5>
                            <p className="text-muted mb-2">{service.description || "Sin descripción"}</p>
                            <div className="d-flex gap-2 flex-wrap mb-2">
                              <span className={`badge ${statusBadge(service.status_name || service.status)}`}>{service.status_name || service.status || "Pendiente"}</span>
                              <span className={`badge ${paymentBadge(service.payment_status)}`}>Pago: {service.payment_status || "Pendiente"}</span>
                              <span className="badge bg-light text-dark border">
                                Tipo: {service.service_type_name || service.service_name || service.type_name || "No definido"}
                              </span>
                            </div>
                          </div>

                          <div className="d-flex gap-2 flex-wrap justify-content-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setExpandedServiceId(isExpanded ? null : id)}
                            >
                              {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                            </button>

                            {service.worker_id ? (
                              <Link to={`/trabajadores/${service.worker_id}`} className="btn btn-sm btn-outline-secondary">
                                Ver trabajador
                              </Link>
                            ) : (
                              <span className="badge bg-light text-dark border align-self-center">Sin trabajador</span>
                            )}

                            {statusLower === "pendiente" ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={actionLoadingId === id}
                                onClick={() => requestCancelService(id)}
                              >
                                Cancelar
                              </button>
                            ) : null}

                            {isCompleted && !paymentDone ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                disabled={actionLoadingId === id}
                                onClick={() => requestPayService(service)}
                              >
                                Pagar
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="mt-3 pt-3 border-top">
                            <div className="row g-2 small">
                              <div className="col-12 col-md-6"><strong>Solicitado:</strong> {fmtDate(service.created_at || service.requested_at)}</div>
                              <div className="col-12 col-md-6"><strong>Programado:</strong> {fmtDate(service.scheduled_at || service.start_date)}</div>
                              <div className="col-12 col-md-6"><strong>Monto estimado:</strong> ${service.estimated_price || service.amount || service.total_amount || "Pendiente"}</div>
                              <div className="col-12 col-md-6"><strong>Referencia pago:</strong> {service.transaction_reference || "-"}</div>
                              <div className="col-12 col-md-6"><strong>Trabajador:</strong> {service.worker_name || service.assigned_worker_name || "Sin asignar"}</div>
                              <div className="col-12 col-md-6"><strong>Teléfono trabajo:</strong> {service.address_phone_number || "-"}</div>
                              <div className="col-12"><strong>Notas:</strong> {service.notes || "Sin notas"}</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
