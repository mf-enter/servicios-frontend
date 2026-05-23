import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { listFromResponse } from "../../api/normalize";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cleanMode, setCleanMode] = useState(() => {
    try {
      return localStorage.getItem("admin_dashboard_clean_mode") === "1";
    } catch (_) {
      return false;
    }
  });

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizeStatus = (value) => String(value ?? "").toLowerCase();

  const setDashboardCleanMode = (enabled) => {
    setCleanMode(enabled);
    try {
      localStorage.setItem("admin_dashboard_clean_mode", enabled ? "1" : "0");
      window.dispatchEvent(new Event("app-data-updated"));
    } catch (_) {}
  };

  const getHiddenHistoryServiceIds = () => {
    const keys = ["hidden_history_service_ids", "worker_hidden_history_service_ids"];

    try {
      const hiddenIds = keys.flatMap((key) => {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
      });

      return new Set(hiddenIds.filter(Boolean));
    } catch (_) {
      return new Set();
    }
  };

  const isHistoryHidden = (service) => {
    const hiddenIds = getHiddenHistoryServiceIds();
    const serviceId = service?.service_id ?? service?.history_id ?? service?.id;
    return hiddenIds.has(String(serviceId ?? ""));
  };

  const filterVisibleServices = (items) => {
    return (items || []).filter((service) => !isHistoryHidden(service));
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [dashboardRes, usersRes, workersRes, servicesRes, paymentsRes] = await Promise.allSettled([
          api.get("/admin/dashboard"),
          api.get("/users"),
          api.get("/workers"),
          api.get("/services"),
          api.get("/payments"),
        ]);

        if (!mounted) return;

        if (dashboardRes.status === "fulfilled") {
          setDashboardData(dashboardRes.value?.data?.data ?? dashboardRes.value?.data ?? null);
        }
        if (usersRes.status === "fulfilled") {
          setUsers(listFromResponse(usersRes.value));
        }
        if (workersRes.status === "fulfilled") {
          setWorkers(listFromResponse(workersRes.value));
        }
        if (servicesRes.status === "fulfilled") {
          setServices(listFromResponse(servicesRes.value));
        }
        if (paymentsRes.status === "fulfilled") {
          setPayments(listFromResponse(paymentsRes.value));
        }

        const allFailed = [dashboardRes, usersRes, workersRes, servicesRes, paymentsRes].every((r) => r.status === "rejected");
        if (allFailed) {
          setError("No se pudo cargar información para monitoreo.");
        }
      } catch (_) {
        if (mounted) setError("No se pudo cargar información para monitoreo.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const refresh = async () => {
      try {
        const [dashboardRes, usersRes, workersRes, servicesRes, paymentsRes] = await Promise.allSettled([
          api.get("/admin/dashboard"),
          api.get("/users"),
          api.get("/workers"),
          api.get("/services"),
          api.get("/payments"),
        ]);

        if (!mounted) return;

        if (dashboardRes.status === "fulfilled") {
          setDashboardData(dashboardRes.value?.data?.data ?? dashboardRes.value?.data ?? null);
        }
        if (usersRes.status === "fulfilled") {
          setUsers(listFromResponse(usersRes.value));
        }
        if (workersRes.status === "fulfilled") {
          setWorkers(listFromResponse(workersRes.value));
        }
        if (servicesRes.status === "fulfilled") {
          setServices(listFromResponse(servicesRes.value));
        }
        if (paymentsRes.status === "fulfilled") {
          setPayments(listFromResponse(paymentsRes.value));
        }
      } catch (_) {}
    };

    load();

    const intervalId = setInterval(() => {
      if (mounted) refresh();
    }, 10000);

    const handleFocus = () => {
      refresh();
    };

    const handleAppDataUpdated = () => {
      refresh();
    };

    const handleStorage = (e) => {
      try {
        if (!e?.key) return;
        if (e.key === "app:data-updated") refresh();
      } catch (_) {}
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("app-data-updated", handleAppDataUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("app-data-updated", handleAppDataUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const visibleServices = useMemo(() => filterVisibleServices(services), [services]);
  const displayServices = cleanMode ? [] : visibleServices;

  const serviceStats = useMemo(() => {
    if (cleanMode) {
      return { inProgress: 0, completed: 0, canceled: 0, total: 0 };
    }

    const inProgress = displayServices.filter((s) => normalizeStatus(s.status_name).includes("progreso")).length;
    const completed = displayServices.filter((s) => normalizeStatus(s.status_name) === "completado").length;
    const canceled = displayServices.filter((s) => normalizeStatus(s.status_name) === "cancelado").length;

    return {
      inProgress,
      completed,
      canceled,
      total: displayServices.length,
    };
  }, [cleanMode, displayServices]);

  const paymentStats = useMemo(() => {
    if (cleanMode) {
      return { collected: 0, pendingAmount: 0, pendingCount: 0 };
    }

    const completedPayments = payments.filter((p) => {
      const status = normalizeStatus(p.status);
      return status === "completado" || status === "paid";
    });
    const pendingPayments = payments.filter((p) => {
      const status = normalizeStatus(p.status);
      return status === "pendiente" || status === "pending" || status === "";
    });

    return {
      collected: completedPayments.reduce((acc, p) => acc + toNumber(p.amount), 0),
      pendingAmount: pendingPayments.reduce((acc, p) => acc + toNumber(p.amount), 0),
      pendingCount: pendingPayments.length,
    };
  }, [cleanMode, payments]);

  const userById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      map.set(u.user_id ?? u.id, u);
    });
    return map;
  }, [users]);

  const pendingCharges = useMemo(() => {
    return displayServices.filter((s) => {
      const status = normalizeStatus(s.status_name);
      const paymentStatus = normalizeStatus(s.payment_status);
      return status === "completado" && paymentStatus !== "completado" && paymentStatus !== "paid";
    });
  }, [displayServices]);

  const paidCharges = useMemo(() => {
    return displayServices.filter((s) => {
      const paymentStatus = normalizeStatus(s.payment_status);
      return paymentStatus === "completado" || paymentStatus === "paid";
    });
  }, [displayServices]);

  const failedCharges = useMemo(() => {
    return displayServices.filter((s) => {
      const paymentStatus = normalizeStatus(s.payment_status);
      return paymentStatus === "fallido" || paymentStatus === "failed";
    });
  }, [displayServices]);

  const canceledCharges = useMemo(() => {
    return displayServices.filter((s) => {
      const paymentStatus = normalizeStatus(s.payment_status);
      const status = normalizeStatus(s.status_name);
      const isPaid = paymentStatus === "completado" || paymentStatus === "paid";
      const isCanceledStatus = paymentStatus === "cancelado" || paymentStatus === "canceled" || paymentStatus === "cancelled" || status === "cancelado";
      return isCanceledStatus && !isPaid;
    });
  }, [displayServices]);

  const acceptedServices = useMemo(() => {
    return displayServices.filter((s) => normalizeStatus(s.status_name) === "aceptado");
  }, [displayServices]);

  const workerClientRelations = useMemo(() => {
    const map = new Map();

    displayServices.forEach((s) => {
      const workerId = s.worker_id ?? s.assigned_worker_id;
      const clientId = s.client_id ?? s.user_id;
      if (!workerId || !clientId) return;

      const key = `${workerId}-${clientId}`;
      const existing = map.get(key) ?? {
        worker_id: workerId,
        worker_name: s.worker_name ?? s.assigned_worker_name ?? `#${workerId}`,
        client_id: clientId,
        client_name: s.client_name ?? s.customer_name ?? `#${clientId}`,
        jobs: 0,
        total: 0,
      };

      existing.jobs += 1;
      existing.total += toNumber(s.amount ?? s.estimated_price ?? s.total_amount ?? 0);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.jobs - a.jobs || b.total - a.total).slice(0, 10);
  }, [displayServices]);

  const workerPerformance = useMemo(() => {
    const byWorker = new Map();

    displayServices.forEach((s) => {
      const workerId = s.worker_id ?? s.assigned_worker_id;
      if (!workerId) return;

      const existing = byWorker.get(workerId) ?? {
        worker_id: workerId,
        worker_name: s.worker_name ?? s.assigned_worker_name ?? `#${workerId}`,
        completed: 0,
        inProgress: 0,
        totalJobs: 0,
        billed: 0,
      };

      const status = normalizeStatus(s.status_name);
      existing.totalJobs += 1;
      existing.billed += toNumber(s.amount ?? s.estimated_price ?? s.total_amount ?? 0);
      if (status === "completado") existing.completed += 1;
      if (status.includes("progreso")) existing.inProgress += 1;

      byWorker.set(workerId, existing);
    });

    return Array.from(byWorker.values()).sort((a, b) => b.totalJobs - a.totalJobs).slice(0, 10);
  }, [displayServices]);

  if (loading) return <div className="container">Cargando monitoreo...</div>;

  const resolveClientInfo = (service) => {
    const clientId = service.client_id ?? service.user_id;
    const client = clientId ? userById.get(clientId) : null;
    const clientName =
      service.client_name ||
      service.customer_name ||
      [client?.name, client?.lastname].filter(Boolean).join(" ") ||
      (clientId ? `#${clientId}` : "Cliente");
    const clientEmail = service.client_email || client?.email || "-";
    const clientPhone = service.client_phone || service.address_phone_number || client?.phone_number || "-";
    return { clientName, clientEmail, clientPhone };
  };

  const cards = [
    { label: "Usuarios", value: dashboardData?.total_users ?? users.length },
    { label: "Trabajadores", value: dashboardData?.total_workers ?? workers.length },
    { label: "Servicios activos", value: dashboardData?.pending_services ?? serviceStats.inProgress },
    { label: "Servicios completados", value: dashboardData?.total_services ?? serviceStats.completed },
    { label: "Cobrado", value: `$${paymentStats.collected.toLocaleString()}` },
    { label: "Pagos pendientes", value: `${paymentStats.pendingCount} ($${paymentStats.pendingAmount.toLocaleString()})` },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <h2 className="section-title mb-1">Monitoreo General</h2>
          <p className="text-muted">Visión de usuarios, trabajadores, relaciones de trabajo y dinero cobrado.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button type="button" className={`btn btn-sm ${cleanMode ? "btn-success" : "btn-outline-secondary"}`} onClick={() => setDashboardCleanMode(!cleanMode)}>
            {cleanMode ? "Salir de modo limpio" : "Modo limpio de pruebas"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => {
              try {
                localStorage.removeItem("hidden_history_service_ids");
                localStorage.removeItem("worker_hidden_history_service_ids");
                localStorage.removeItem("admin_dashboard_clean_mode");
              } catch (_) {}
              setCleanMode(false);
              window.dispatchEvent(new Event("app-data-updated"));
            }}
          >
            Limpiar pruebas
          </button>
        </div>
      </div>

      {cleanMode ? (
        <div className="alert alert-success border-0 mt-3">
          <strong>Modo limpio activado.</strong> El monitoreo se muestra vacío para hacer pruebas.
        </div>
      ) : null}

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!cleanMode ? <div className="row g-3">
        {cards.map((c)=>(
          <div key={c.label} className="col-12 col-md-6 col-xl-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-muted">{c.label}</div>
                <div className="display-6 fw-bold">{c.value}</div>
                <small className="text-muted">Datos actualizados del sistema</small>
              </div>
            </div>
          </div>
        ))}
      </div> : null}

      {!cleanMode ? <div className="card shadow-sm mt-4 border-0">
        <div className="card-body">
          <h5 className="mb-3">Relación trabajador-cliente</h5>
          {workerClientRelations.length === 0 ? (
            <div className="alert alert-light border mb-0">Sin datos de relación para mostrar.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Trabajador</th>
                    <th>Usuario</th>
                    <th>Veces trabajadas</th>
                    <th>Total facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {workerClientRelations.map((row) => (
                    <tr key={`${row.worker_id}-${row.client_id}`}>
                      <td>{row.worker_name}</td>
                      <td>{row.client_name}</td>
                      <td>{row.jobs}</td>
                      <td>${row.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div> : null}

      {!cleanMode ? <div className="card shadow-sm mt-4 border-0">
        <div className="card-body">
          <h5 className="mb-3">Productividad de trabajadores</h5>
          {workerPerformance.length === 0 ? (
            <div className="alert alert-light border mb-0">Sin productividad registrada.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th>Trabajador</th>
                    <th>Trabajos</th>
                    <th>En progreso</th>
                    <th>Completados</th>
                    <th>Cotizacion acumulada</th>
                  </tr>
                </thead>
                <tbody>
                  {workerPerformance.map((row) => (
                    <tr key={row.worker_id}>
                      <td>{row.worker_name}</td>
                      <td>{row.totalJobs}</td>
                      <td>{row.inProgress}</td>
                      <td>{row.completed}</td>
                      <td>${row.billed.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div> : null}

      {!cleanMode ? <div className="card shadow-sm mt-4 border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">🔔 Notificaciones de cobranza</h5>
              <p className="text-muted small mb-0">Servicios con estados pendientes que requieren seguimiento</p>
            </div>
            <div className="text-end d-flex flex-wrap justify-content-end gap-2">
              <div className="badge bg-info text-dark fs-6">{acceptedServices.length} aceptadas</div>
              <div className="badge bg-danger fs-6">{pendingCharges.length} por cobrar</div>
              <div className="badge bg-success fs-6">{paidCharges.length} pagadas</div>
              <div className="badge bg-secondary fs-6">{canceledCharges.length} canceladas</div>
              {failedCharges.length > 0 ? <div className="badge bg-danger text-white fs-6">{failedCharges.length} fallidas</div> : null}
            </div>
          </div>

          {acceptedServices.length === 0 && pendingCharges.length === 0 && paidCharges.length === 0 && canceledCharges.length === 0 && failedCharges.length === 0 ? (
            <div className="alert alert-success border-0 mb-0">
              <strong>✅ Sin notificaciones pendientes</strong> - Todos los servicios están al día
            </div>
          ) : (
            <>
              {acceptedServices.length > 0 && (
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span className="badge bg-info me-2">⏳ En progreso</span>
                    <h6 className="mb-0">Cotizaciones aceptadas ({acceptedServices.length})</h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{width: "12%"}}>Servicio</th>
                          <th style={{width: "20%"}}>Cliente</th>
                          <th style={{width: "18%"}}>Contacto</th>
                          <th style={{width: "20%"}}>Trabajador</th>
                          <th style={{width: "15%"}} className="text-end">Cotización</th>
                          <th style={{width: "15%"}} className="text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptedServices.map((service) => {
                          const { clientName, clientEmail, clientPhone } = resolveClientInfo(service);
                          const amount = toNumber(service.estimated_price ?? service.amount ?? service.total_amount ?? 0);
                          return (
                            <tr key={`accepted-${service.service_id ?? service.id}`}>
                              <td className="fw-semibold">#{service.service_id ?? service.id}</td>
                              <td>{clientName}</td>
                              <td>
                                <div className="small">{clientEmail}</div>
                                <div className="text-muted small">{clientPhone}</div>
                              </td>
                              <td className="small">{service.worker_name || service.assigned_worker_name || "-"}</td>
                              <td className="text-end fw-bold">${amount.toLocaleString()}</td>
                              <td className="text-center"><span className="badge bg-info">Aceptado</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {pendingCharges.length > 0 && (
                <div>
                  <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span className="badge bg-danger me-2">💰 Cobro pendiente</span>
                    <h6 className="mb-0">Servicios completados sin pagar ({pendingCharges.length})</h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{width: "12%"}}>Servicio</th>
                          <th style={{width: "20%"}}>Cliente</th>
                          <th style={{width: "18%"}}>Contacto</th>
                          <th style={{width: "20%"}}>Trabajador</th>
                          <th style={{width: "15%"}} className="text-end">Monto</th>
                          <th style={{width: "15%"}} className="text-center">Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingCharges.map((service, index) => {
                          const { clientName, clientEmail, clientPhone } = resolveClientInfo(service);
                          const amount = toNumber(service.amount ?? service.estimated_price ?? service.total_amount ?? 0);
                          return (
                            <tr key={`charge-${service.service_id ?? service.id}-${index}`}>
                              <td className="fw-semibold">#{service.service_id ?? service.id}</td>
                              <td>{clientName}</td>
                              <td>
                                <div className="small">{clientEmail}</div>
                                <div className="text-muted small">{clientPhone}</div>
                              </td>
                              <td className="small">{service.worker_name || service.assigned_worker_name || "-"}</td>
                              <td className="text-end fw-bold">${amount.toLocaleString()}</td>
                              <td className="text-center"><span className="badge bg-danger">Pendiente</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {paidCharges.length > 0 && (
                <div className="mt-4">
                  <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span className="badge bg-success me-2">✅ Pagado</span>
                    <h6 className="mb-0">Servicios pagados ({paidCharges.length})</h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Servicio</th>
                          <th>Cliente</th>
                          <th>Trabajador</th>
                          <th className="text-end">Monto</th>
                          <th className="text-center">Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidCharges.map((service, index) => {
                          const { clientName } = resolveClientInfo(service);
                          const amount = toNumber(service.amount ?? service.estimated_price ?? service.total_amount ?? 0);
                          return (
                            <tr key={`paid-${service.service_id ?? service.id}-${index}`}>
                              <td className="fw-semibold">#{service.service_id ?? service.id}</td>
                              <td>{clientName}</td>
                              <td className="small">{service.worker_name || service.assigned_worker_name || "-"}</td>
                              <td className="text-end fw-bold">${amount.toLocaleString()}</td>
                              <td className="text-center"><span className="badge bg-success">Pagado</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {canceledCharges.length > 0 && (
                <div className="mt-4">
                  <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span className="badge bg-secondary me-2">🚫 Cancelado</span>
                    <h6 className="mb-0">Servicios cancelados ({canceledCharges.length})</h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Servicio</th>
                          <th>Cliente</th>
                          <th>Trabajador</th>
                          <th className="text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {canceledCharges.map((service, index) => {
                          const { clientName } = resolveClientInfo(service);
                          return (
                            <tr key={`canceled-${service.service_id ?? service.id}-${index}`}>
                              <td className="fw-semibold">#{service.service_id ?? service.id}</td>
                              <td>{clientName}</td>
                              <td className="small">{service.worker_name || service.assigned_worker_name || "-"}</td>
                              <td className="text-center"><span className="badge bg-secondary">Cancelado</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {failedCharges.length > 0 && (
                <div className="mt-4">
                  <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span className="badge bg-danger me-2">⚠️ Fallido</span>
                    <h6 className="mb-0">Pagos fallidos ({failedCharges.length})</h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Servicio</th>
                          <th>Cliente</th>
                          <th>Trabajador</th>
                          <th className="text-center">Estado de pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedCharges.map((service, index) => {
                          const { clientName } = resolveClientInfo(service);
                          return (
                            <tr key={`failed-${service.service_id ?? service.id}-${index}`}>
                              <td className="fw-semibold">#{service.service_id ?? service.id}</td>
                              <td>{clientName}</td>
                              <td className="small">{service.worker_name || service.assigned_worker_name || "-"}</td>
                              <td className="text-center"><span className="badge bg-danger">Fallido</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div> : null}

    </div>
  );
}