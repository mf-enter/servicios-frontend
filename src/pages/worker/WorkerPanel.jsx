import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";

export default function WorkerPanel() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("trabajos");
  const [worker, setWorker] = useState(null);
  const [pendingServices, setPendingServices] = useState([]);
  const [history, setHistory] = useState([]);
  const [profileForm, setProfileForm] = useState({
    name: "",
    lastname: "",
    username: "",
    email: "",
    phone_number: "",
    bio: "",
    hourly_rate: "",
    experience_years: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    service_id: "",
    payment_method_id: "",
    amount: "",
    transaction_reference: "",
  });
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);

  const getServiceStatusLabel = (service) => {
    const raw = String(service?.status_name ?? service?.status ?? "").trim();
    if (raw) return raw;

    const statusId = Number(service?.status_id ?? service?.service_status_id ?? 0);
    const statusMap = {
      1: "Pendiente",
      2: "Aceptado",
      3: "En progreso",
      4: "Completado",
      5: "Cancelado",
    };

    return statusMap[statusId] || "Pendiente";
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const loadWorkerData = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        if (payload?.role !== "worker") {
          navigate("/login", { replace: true });
          return;
        }

        const workerId = payload?.worker_id ?? payload?.user_id;
        const workerName = payload?.name ?? payload?.fullname ?? "";

        const [servicesResponse, historyResponse] = await Promise.allSettled([
          api.get("/workers/me/services"),
          api.get("/workers/me/history"),
        ]);

        const workerData = {
          user_id: workerId,
          worker_id: payload?.worker_id ?? null,
          username: payload?.username ?? "",
          email: payload?.email ?? "",
          phone_number: payload?.phone_number ?? "",
          name: workerName,
          lastname: payload?.lastname ?? "",
          role: payload?.role,
          bio: payload?.bio ?? "",
          hourly_rate: payload?.hourly_rate ?? "",
          experience_years: payload?.experience_years ?? "",
        };

        setWorker(workerData);
        setProfileForm({
          name: workerData.name || "",
          lastname: workerData.lastname || "",
          username: workerData.username || "",
          email: workerData.email || "",
          phone_number: workerData.phone_number || "",
          bio: workerData.bio || "",
          hourly_rate: workerData.hourly_rate || "",
          experience_years: workerData.experience_years || "",
        });

        setPendingServices(servicesResponse.status === "fulfilled" ? listFromResponse(servicesResponse.value) : []);
        setHistory(historyResponse.status === "fulfilled" ? listFromResponse(historyResponse.value) : []);

        try {
          const paymentsRes = await api.get("/payments");
          setPayments(listFromResponse(paymentsRes));
        } catch (_) {
          setPayments([]);
        }
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadWorkerData();
  }, [token, navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleProfileInput = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateWorkerProfile = async (event) => {
    event.preventDefault();
    if (!worker?.worker_id && !worker?.user_id) return;

    const workerId = worker.worker_id ?? worker.user_id;
    const payload = {
      name: profileForm.name?.trim() || worker.name,
      lastname: profileForm.lastname?.trim() || worker.lastname || "",
      username: profileForm.username?.trim() || null,
      email: profileForm.email?.trim() || null,
      phone_number: profileForm.phone_number?.trim() || null,
      bio: profileForm.bio?.trim() || null,
      hourly_rate: Number(profileForm.hourly_rate || 0),
      experience_years: Number(profileForm.experience_years || 0),
    };

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

      await api.put(`/workers/${workerId}`, payload);

      setWorker((prev) => ({ ...prev, ...payload }));
      setSuccess("Perfil de trabajador actualizado correctamente y visible en la lista pública.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const updateServiceStatus = async (serviceId, newStatus) => {
    try {
      setError("");
      setSuccess("");
      await api.patch(`/services/${serviceId}/status`, { status_name: newStatus });
      setPendingServices((prev) =>
        prev.map((s) => (s.service_id === serviceId ? { ...s, status_name: newStatus } : s))
      );
      setSuccess(`Trabajo #${serviceId} actualizado a "${newStatus}"`);
    } catch (err) {
      if (err.response?.status === 409) {
        setError("No se puede cambiar el estado del servicio. Revisa las reglas de transición.");
      } else if (err.response?.status === 400) {
        setError("Datos inválidos. Verifica el estado que intentas asignar.");
      } else if (err.response?.status === 403) {
        setError("No tienes permiso para cambiar el estado de este servicio.");
      } else if (err.response?.status === 404) {
        setError("El servicio no existe.");
      } else {
        setError(apiErrorMessage(err));
      }
    }
  };

  const cancelService = async (serviceId) => {
    if (!window.confirm("¿Seguro que deseas cancelar este trabajo?")) return;

    try {
      setError("");
      setSuccess("");
      await api.patch(`/services/${serviceId}/cancel`);

      setPendingServices((prev) =>
        prev.map((s) => (s.service_id === serviceId ? { ...s, status_name: "Cancelado" } : s))
      );
      setSuccess(`Trabajo #${serviceId} cancelado`);
    } catch (err) {
      if (err.response?.status === 409) {
        setError("No se puede cancelar el servicio en este estado.");
      } else if (err.response?.status === 403) {
        setError("No tienes permiso para cancelar este servicio.");
      } else if (err.response?.status === 404) {
        setError("El servicio no existe.");
      } else {
        setError(apiErrorMessage(err));
      }
    }
  };

  const deleteHistory = async (historyId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro del historial?")) return;

    try {
      await api.delete(`/history/${historyId}`);
      setHistory((prev) => prev.filter((h) => (h.history_id ?? h.id) !== historyId));
      setSuccess("Registro del historial eliminado.");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handlePaymentInput = (event) => {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const savePayment = async (event) => {
    event.preventDefault();
    if (!paymentForm.service_id || !paymentForm.amount) {
      setError("Service ID y monto son obligatorios.");
      return;
    }

    try {
      setSavingPayment(true);
      setError("");
      setSuccess("");

      // Validar que el servicio esté en estado Completado
      const service = [...pendingServices, ...history].find((s) => s.service_id === Number(paymentForm.service_id));
      if (service) {
        const status = String(service.status_name ?? "").toLowerCase();
        if (status !== "completado") {
          setError("El pago solo se puede registrar cuando el servicio está Completado.");
          setSavingPayment(false);
          return;
        }
      }

      if (editingPaymentId) {
        await api.put(`/payments/${editingPaymentId}`, paymentForm);
        setSuccess("Pago actualizado correctamente.");
      } else {
        await api.post("/payments", paymentForm);
        setSuccess("Pago registrado correctamente.");
      }

      setPaymentForm({
        service_id: "",
        payment_method_id: "",
        amount: "",
        transaction_reference: "",
      });
      setEditingPaymentId(null);

      try {
        const paymentsRes = await api.get("/payments");
        setPayments(listFromResponse(paymentsRes));
      } catch (_) {}
    } catch (err) {
      if (err.response?.status === 409) {
        setError("El servicio debe estar en estado Completado para registrar un pago.");
      } else if (err.response?.status === 404) {
        setError("El servicio no existe.");
      } else {
        setError(apiErrorMessage(err));
      }
    } finally {
      setSavingPayment(false);
    }
  };

  const editPayment = (payment) => {
    setPaymentForm({
      service_id: payment.service_id || "",
      payment_method_id: payment.payment_method_id || "",
      amount: payment.amount || "",
      transaction_reference: payment.transaction_reference || "",
    });
    setEditingPaymentId(payment.payment_id || payment.id);
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este pago?")) return;

    try {
      setError("");
      setSuccess("");
      await api.delete(`/payments/${paymentId}`);
      setSuccess("Pago eliminado correctamente.");
      setPayments((prev) => prev.filter((p) => (p.payment_id ?? p.id) !== paymentId));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const getAddress = (service) => {
    return (
      service.full_address ||
      service.address ||
      service.domicilio ||
      [service.street_name, service.ext_number].filter(Boolean).join(" ") ||
      [service.city_name, service.state_name].filter(Boolean).join(", ") ||
      "Domicilio no disponible"
    );
  };

  const statusLower = (value) => String(value ?? "").toLowerCase();
  const serviceStatusLower = (service) => getServiceStatusLabel(service).toLowerCase();

  const totalCollected = useMemo(() => {
    return history
      .filter((s) => statusLower(s.payment_status) === "completado" || serviceStatusLower(s) === "completado")
      .reduce((acc, s) => acc + Number(s.amount ?? s.estimated_price ?? s.total_amount ?? 0), 0);
  }, [history]);

  const pendingAmount = useMemo(() => {
    return pendingServices
      .filter((s) => {
        const payment = statusLower(s.payment_status);
        return payment !== "completado" && payment !== "paid";
      })
      .reduce((acc, s) => acc + Number(s.amount ?? s.estimated_price ?? s.total_amount ?? 0), 0);
  }, [pendingServices]);

  const totalJobs = pendingServices.length + history.length;
  const onlyPendingServices = useMemo(() => {
    return pendingServices.filter((s) => {
      const status = serviceStatusLower(s);
      return status === "pendiente" || status === "";
    });
  }, [pendingServices]);

  const onlyAcceptedServices = useMemo(() => {
    return pendingServices.filter((s) => {
      const status = serviceStatusLower(s);
      return status === "en progreso" || status === "aceptado";
    });
  }, [pendingServices]);

  const availableServices = useMemo(() => {
    const combined = [
      ...pendingServices.map((s) => ({
        service_id: s.service_id,
        display: `#${s.service_id} - ${s.client_name || "Cliente"} (${getServiceStatusLabel(s)})`,
        amount: s.estimated_price || s.amount || 0,
      })),
      ...history.map((h) => ({
        service_id: h.service_id,
        display: `#${h.service_id} - ${h.client_name || "Cliente"} (${getServiceStatusLabel(h)})`,
        amount: h.estimated_price || h.amount || 0,
      })),
    ];
    return combined.filter((v, i, a) => a.findIndex((t) => t.service_id === v.service_id) === i);
  }, [pendingServices, history]);
  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-12 col-lg-3">
          <div className="card shadow-sm border-0 sticky-top" style={{ top: 20 }}>
            <div className="card-body text-center">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 80, height: 80, fontSize: "2rem" }}
              >
                🔧
              </div>
              <h5 className="fw-bold">Mi Panel</h5>
              <p className="text-muted small">{worker?.name || "Trabajador"}</p>

              <div className="text-muted small mb-3">
                <p className="mb-1">Trabajos asignados: {pendingServices.length}</p>
                <p className="mb-1">Historial: {history.length}</p>
                <p className="mb-1">Total trabajos: {totalJobs}</p>
                <p className="mb-1">Cobrado: ${totalCollected.toLocaleString()}</p>
                <p className="mb-0">Pendiente: ${pendingAmount.toLocaleString()}</p>
              </div>

              <button className="btn btn-sm btn-outline-danger w-100" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-9">
          <h2 className="section-title mb-1">Panel de Trabajador</h2>
          <p className="text-muted mb-4">Gestiona tus servicios, perfil profesional y cobros desde un solo lugar.</p>

          <div className="btn-group mb-4" role="group" aria-label="Tabs trabajador">
            <button
              type="button"
              className={`btn ${activeTab === "trabajos" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTab("trabajos")}
            >
              Trabajos
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "perfil" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTab("perfil")}
            >
              Mi perfil y servicios
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "cobros" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTab("cobros")}
            >
              Cobros
            </button>
          </div>

          {loading && <div className="alert alert-info">Cargando trabajos...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {activeTab === "perfil" ? (
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body">
                <h5 className="mb-3">Configuración del perfil</h5>
                <p className="text-muted">Aquí puedes editar la información que ve el usuario al momento de contratarte.</p>

                <form onSubmit={updateWorkerProfile} className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Nombre</label>
                    <input className="form-control" name="name" value={profileForm.name} onChange={handleProfileInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Apellido</label>
                    <input className="form-control" name="lastname" value={profileForm.lastname} onChange={handleProfileInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Usuario</label>
                    <input className="form-control" name="username" value={profileForm.username} onChange={handleProfileInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Email</label>
                    <input className="form-control" name="email" type="email" value={profileForm.email} onChange={handleProfileInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Teléfono</label>
                    <input className="form-control" name="phone_number" value={profileForm.phone_number} onChange={handleProfileInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Tarifa por hora</label>
                    <input
                      className="form-control"
                      name="hourly_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={profileForm.hourly_rate}
                      onChange={handleProfileInput}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Años de experiencia</label>
                    <input
                      className="form-control"
                      name="experience_years"
                      type="number"
                      min="0"
                      value={profileForm.experience_years}
                      onChange={handleProfileInput}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Descripción de servicios</label>
                    <textarea className="form-control" name="bio" rows="4" value={profileForm.bio} onChange={handleProfileInput} />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                      {savingProfile ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {activeTab === "cobros" ? (
            <>
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <h5 className="mb-3">Resumen de cobros</h5>
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-4">
                      <div className="p-3 border rounded">
                        <div className="text-muted">Cobrado total</div>
                        <div className="h4 mb-0">${totalCollected.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="p-3 border rounded">
                        <div className="text-muted">Pendiente por cobrar</div>
                        <div className="h4 mb-0">${pendingAmount.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="p-3 border rounded">
                        <div className="text-muted">Servicios completados</div>
                        <div className="h4 mb-0">{history.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-lg-5">
                  <div className="card shadow-sm border-0">
                    <div className="card-body">
                      <h5 className="mb-3">{editingPaymentId ? "Editar pago" : "Registrar nuevo pago"}</h5>
                      <form onSubmit={savePayment} className="d-grid gap-2">
                        <div>
                          <label className="form-label">Selecciona un servicio *</label>
                          <select
                            className="form-select"
                            name="service_id"
                            value={paymentForm.service_id}
                            onChange={(e) => {
                              handlePaymentInput(e);
                              const selected = availableServices.find(s => s.service_id === Number(e.target.value));
                              if (selected && !paymentForm.amount) {
                                setPaymentForm(prev => ({
                                  ...prev,
                                  amount: selected.amount || ""
                                }));
                              }
                            }}
                            required
                          >
                            <option value="">Selecciona un servicio</option>
                            {availableServices.map(s => (
                              <option key={s.service_id} value={s.service_id}>
                                {s.display}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Payment Method ID"
                          name="payment_method_id"
                          value={paymentForm.payment_method_id}
                          onChange={handlePaymentInput}
                        />
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Monto"
                          name="amount"
                          value={paymentForm.amount}
                          onChange={handlePaymentInput}
                          step="0.01"
                          required
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Referencia de transacción"
                          name="transaction_reference"
                          value={paymentForm.transaction_reference}
                          onChange={handlePaymentInput}
                        />
                        <button type="submit" className="btn btn-primary" disabled={savingPayment}>
                          {savingPayment ? "Guardando..." : editingPaymentId ? "Actualizar" : "Guardar"}
                        </button>
                        {editingPaymentId && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setEditingPaymentId(null);
                              setPaymentForm({
                                service_id: "",
                                payment_method_id: "",
                                amount: "",
                                transaction_reference: "",
                              });
                            }}
                          >
                            Cancelar
                          </button>
                        )}
                      </form>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-7">
                  <div className="card shadow-sm border-0">
                    <div className="card-body">
                      <h5 className="mb-3">Mis pagos</h5>
                      {payments.length === 0 ? (
                        <div className="alert alert-light border">No hay pagos registrados.</div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Servicio</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th>Referencia</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payments.map((payment) => (
                                <tr key={payment.payment_id ?? payment.id}>
                                  <td>#{payment.service_id}</td>
                                  <td>${Number(payment.amount || 0).toLocaleString()}</td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        payment.status === "Completado"
                                          ? "bg-success"
                                          : payment.status === "Pendiente"
                                            ? "bg-warning"
                                            : "bg-danger"
                                      }`}
                                    >
                                      {payment.status}
                                    </span>
                                  </td>
                                  <td>{payment.transaction_reference || "-"}</td>
                                  <td>
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-outline-primary"
                                        onClick={() => editPayment(payment)}
                                        title="Editar"
                                      >
                                        ✎
                                      </button>
                                      <button
                                        className="btn btn-outline-danger"
                                        onClick={() => deletePayment(payment.payment_id ?? payment.id)}
                                        title="Eliminar"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h5 className="mb-3">Detalles de servicios y pagos</h5>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Servicio</th>
                          <th>Cliente</th>
                          <th>Estado</th>
                          <th>Pago</th>
                          <th>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...pendingServices, ...history].map((service) => (
                          <tr key={`service-${service.service_id}`}>
                            <td>#{service.service_id}</td>
                            <td>{service.client_name || service.customer_name || "-"}</td>
                            <td>{getServiceStatusLabel(service)}</td>
                            <td>{service.payment_status || "Pendiente"}</td>
                            <td>${Number(service.amount ?? service.estimated_price ?? service.total_amount ?? 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "trabajos" ? (
            <>
              {!loading && pendingServices.length === 0 ? (
                <div className="alert alert-info">
                  <p className="mb-0">No hay trabajos en este momento.</p>
                </div>
              ) : null}

              {/* Trabajos Pendientes */}
              {onlyPendingServices.length > 0 && (
                <>
                  <h4 className="mb-3">📋 Trabajos Pendientes de Aceptar ({onlyPendingServices.length})</h4>
                  <div className="row g-3">
                    {onlyPendingServices.map((service) => (
                      <div key={`pending-${service.service_id}`} className="col-12">
                        <div className="card shadow-sm border-0 border-start border-warning border-3">
                          <div className="card-body">
                            <div className="row align-items-start">
                              <div className="col">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <h5 className="fw-bold mb-0">Trabajo #{service.service_id}</h5>
                                  <span className="badge bg-secondary">{getServiceStatusLabel(service)}</span>
                                </div>
                                <p className="text-muted mb-2">{service.description}</p>
                                <div className="d-flex gap-3 flex-wrap small">
                                  <span><strong>Cliente:</strong> {service.client_name || "Sin nombre"}</span>
                                  <span><strong>Tarifa:</strong> ${service.estimated_price || "Pendiente"}</span>
                                  <span><strong>Domicilio:</strong> {getAddress(service)}</span>
                                </div>
                              </div>
                              <div className="col-auto">
                                <button className="btn btn-sm btn-warning" onClick={() => updateServiceStatus(service.service_id, "En progreso")}>
                                  👉 Aceptar / Iniciar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Trabajos Aceptados */}
              {onlyAcceptedServices.length > 0 && (
                <>
                  <h4 className="mb-3 mt-4">⚙️ Trabajos En Progreso ({onlyAcceptedServices.length})</h4>
                  <div className="row g-3">
                    {onlyAcceptedServices.map((service) => (
                      <div key={`accepted-${service.service_id}`} className="col-12">
                        <div className="card shadow-sm border-0 border-start border-info border-3">
                          <div className="card-body">
                            <div className="row align-items-start">
                              <div className="col">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <h5 className="fw-bold mb-0">Trabajo #{service.service_id}</h5>
                                  <span className="badge bg-info">{getServiceStatusLabel(service)}</span>
                                </div>
                                <p className="text-muted mb-2">{service.description}</p>
                                <div className="d-flex gap-3 flex-wrap small">
                                  <span><strong>Cliente:</strong> {service.client_name || "Sin nombre"}</span>
                                  <span><strong>Teléfono:</strong> {service.address_phone_number || "N/A"}</span>
                                  <span><strong>Tarifa:</strong> ${service.estimated_price || "Pendiente"}</span>
                                  <span><strong>Domicilio:</strong> {getAddress(service)}</span>
                                </div>
                              </div>
                              <div className="col-auto">
                                <div className="btn-group-vertical gap-1 d-flex">
                                  <button className="btn btn-sm btn-success" onClick={() => updateServiceStatus(service.service_id, "Completado")}>
                                    ✓ Marcar completado
                                  </button>
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => cancelService(service.service_id)}>
                                    ✕ Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Trabajos Completados/Cancelados - Historial */}
              {history.length > 0 && (
                <>
                  <h4 className="mb-3 mt-4">✓ Historial de Trabajos ({history.length})</h4>
                  <div className="row g-3">
                    {history.map((service) => (
                      <div key={`history-${service.service_id}`} className="col-12">
                        <div className="card shadow-sm border-0">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h5 className="fw-bold mb-1">Trabajo #{service.service_id}</h5>
                                <p className="text-muted mb-1">{service.description}</p>
                                <div className="small text-muted">
                                  <span className="me-3"><strong>Cliente:</strong> {service.client_name || service.customer_name || '-'}</span>
                                  <span className="me-3"><strong>Estado:</strong> {getServiceStatusLabel(service) || service.payment_status || '-'}</span>
                                  <span><strong>Monto:</strong> ${Number(service.amount ?? service.estimated_price ?? service.total_amount ?? 0).toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="btn-group-vertical">
                                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteHistory(service.history_id ?? service.id)}>Eliminar</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
