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

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizeStatus = (value) => String(value ?? "").toLowerCase();

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

    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const serviceStats = useMemo(() => {
    const inProgress = services.filter((s) => normalizeStatus(s.status_name).includes("progreso")).length;
    const completed = services.filter((s) => normalizeStatus(s.status_name) === "completado").length;
    const canceled = services.filter((s) => normalizeStatus(s.status_name) === "cancelado").length;

    return {
      inProgress,
      completed,
      canceled,
      total: services.length,
    };
  }, [services]);

  const paymentStats = useMemo(() => {
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
  }, [payments]);

  const userById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      map.set(u.user_id ?? u.id, u);
    });
    return map;
  }, [users]);

  const pendingCharges = useMemo(() => {
    return services.filter((s) => {
      const status = normalizeStatus(s.status_name);
      const paymentStatus = normalizeStatus(s.payment_status);
      return status === "completado" && paymentStatus !== "completado" && paymentStatus !== "paid";
    });
  }, [services]);

  const acceptedServices = useMemo(() => {
    return services.filter((s) => normalizeStatus(s.status_name) === "aceptado");
  }, [services]);

  const workerClientRelations = useMemo(() => {
    const map = new Map();

    services.forEach((s) => {
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
  }, [services]);

  const workerPerformance = useMemo(() => {
    const byWorker = new Map();

    services.forEach((s) => {
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
  }, [services]);

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
      <h2 className="section-title mb-1">Monitoreo General</h2>
      <p className="text-muted">Visión de usuarios, trabajadores, relaciones de trabajo y dinero cobrado.</p>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3">
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
      </div>

      <div className="card shadow-sm mt-4 border-0">
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
      </div>

      <div className="card shadow-sm mt-4 border-0">
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
      </div>

      <div className="card shadow-sm mt-4 border-0">
        <div className="card-body">
          <h5 className="mb-2">Notificaciones de cobranza</h5>
          <p className="text-muted">Servicios completados con pago pendiente e informacion del cliente.</p>
          {acceptedServices.length > 0 && (
            <div className="mb-3">
              <h6 className="mb-2">Cotizaciones aceptadas (pendientes de inicio/completado)</h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Cliente</th>
                      <th>Contacto</th>
                      <th>Trabajador</th>
                      <th>Cotizacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acceptedServices.map((service) => {
                      const { clientName, clientEmail, clientPhone } = resolveClientInfo(service);
                      const amount = toNumber(service.estimated_price ?? service.amount ?? service.total_amount ?? 0);
                      return (
                        <tr key={`accepted-${service.service_id ?? service.id}`}>
                          <td>#{service.service_id ?? service.id}</td>
                          <td>{clientName}</td>
                          <td>
                            <div>{clientEmail}</div>
                            <div className="text-muted small">{clientPhone}</div>
                          </td>
                          <td>{service.worker_name || service.assigned_worker_name || "-"}</td>
                          <td>${amount.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {pendingCharges.length === 0 ? (
            <div className="alert alert-light border mb-0">Sin cobranzas pendientes.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Servicio</th>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th>Trabajador</th>
                    <th>Pago</th>
                    <th>Cotizacion</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCharges.map((service) => {
                    const { clientName, clientEmail, clientPhone } = resolveClientInfo(service);
                    const amount = toNumber(service.amount ?? service.estimated_price ?? service.total_amount ?? 0);
                    return (
                      <tr key={`charge-${service.service_id ?? service.id}`}>
                        <td>#{service.service_id ?? service.id}</td>
                        <td>{clientName}</td>
                        <td>
                          <div>{clientEmail}</div>
                          <div className="text-muted small">{clientPhone}</div>
                        </td>
                        <td>{service.worker_name || service.assigned_worker_name || "-"}</td>
                        <td>{service.payment_status || "Pendiente"}</td>
                        <td>${amount.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}