import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";

export default function WorkerPanel() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const hiddenHistoryStorageKey = "worker_hidden_history_service_ids";

  const [activeTab, setActiveTab] = useState("trabajos");
  const [worker, setWorker] = useState(null);
  const [pendingServices, setPendingServices] = useState([]);
  const [history, setHistory] = useState([]);
  const [profileForm, setProfileForm] = useState({
    name: "",
    lastname: "",
    email: "",
    phone_number: "",
    bio: "",
    specialty: "",
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
  const [quoteInputs, setQuoteInputs] = useState({});
  const [sendingQuoteId, setSendingQuoteId] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const getHiddenHistoryServiceIds = () => {
    try {
      const raw = localStorage.getItem(hiddenHistoryStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set((Array.isArray(parsed) ? parsed : []).map((value) => String(value)));
    } catch (_) {
      return new Set();
    }
  };

  const isHistoryHidden = (serviceId) => getHiddenHistoryServiceIds().has(String(serviceId ?? ""));

  const filterHiddenServices = (items) => {
    return (items || []).filter((item) => {
      const serviceId = item?.service_id ?? item?.history_id ?? item?.id;
      return !isHistoryHidden(serviceId);
    });
  };

  const hideHistoryServiceId = (serviceId) => {
    try {
      const current = Array.from(getHiddenHistoryServiceIds());
      const normalized = String(serviceId ?? "");
      if (normalized && !current.includes(normalized)) {
        current.push(normalized);
        localStorage.setItem(hiddenHistoryStorageKey, JSON.stringify(current));
      }
    } catch (_) {}
  };

  const parseLocalJSON = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch (_) {
      return null;
    }
  };

  const getClientProfileFromLocalStorage = (service) => {
    const candidateIds = [
      service?.client_id,
      service?.client_user_id,
      service?.customer_id,
      service?.user_id,
    ].filter(Boolean);

    for (const candidateId of candidateIds) {
      const byClientKey = parseLocalJSON(localStorage.getItem(`client_profile_${candidateId}`));
      if (byClientKey) return byClientKey;

      const byUserKey = parseLocalJSON(localStorage.getItem(`user_profile_${candidateId}`));
      if (byUserKey) return byUserKey;
    }

    // Si no hay id, intentar emparejar por email, teléfono o nombre buscando en localStorage
    try {
      const targetEmail = (service?.client_email || service?.email || service?.customer_email || "").toLowerCase();
      const targetPhone = (service?.client_phone || service?.address_phone_number || service?.phone_number || "").replace(/\D/g, "");
      const targetName = (service?.client_name || service?.customer_name || service?.user_name || "").toLowerCase();

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (!key.startsWith("client_profile_") && !key.startsWith("user_profile_")) continue;
        const raw = localStorage.getItem(key);
        const parsed = parseLocalJSON(raw);
        if (!parsed) continue;

        const pEmail = (parsed.email || parsed.client_email || "").toLowerCase();
        if (targetEmail && pEmail && targetEmail === pEmail) return parsed;

        const pPhone = (parsed.phone_number || parsed.client_phone || parsed.phone || "").replace(/\D/g, "");
        if (targetPhone && pPhone && targetPhone === pPhone) return parsed;

        const full = ([parsed.name, parsed.lastname].filter(Boolean).join(" ") || parsed.fullname || "").toLowerCase();
        if (targetName && full && full.includes(targetName)) return parsed;
      }
    } catch (_) {}

    return null;
  };

  const enrichServiceWithClientProfile = (service) => {
    const clientProfile = getClientProfileFromLocalStorage(service);
    if (!clientProfile) return service;

    const fullName = [clientProfile.name, clientProfile.lastname].filter(Boolean).join(" ").trim();

    return {
      ...service,
      client_name: service.client_name || clientProfile.name || service.customer_name || "",
      customer_name: service.customer_name || fullName || service.client_name || "",
      client_phone: service.client_phone || service.address_phone_number || clientProfile.phone_number || clientProfile.phone || "",
      client_email: service.client_email || clientProfile.email || "",
      client_address: service.client_address || clientProfile.address || "",
      client_city: service.client_city || clientProfile.city || "",
      client_state: service.client_state || clientProfile.state || "",
    };
  };

  const normalizeIncomingServices = (items) => filterHiddenServices(items).map(enrichServiceWithClientProfile);

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

    let mounted = true;

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

        const [servicesResponse, historyResponse, profileResponse] = await Promise.allSettled([
          api.get("/workers/me/services"),
          api.get("/workers/me/history"),
          api.get("/workers/me/profile"),
        ]);

        if (!mounted) return;

        // Extraer datos del perfil del backend
        let profileData = {};
        if (profileResponse.status === "fulfilled" && profileResponse.value?.data) {
          profileData = profileResponse.value.data;
        }

        const workerData = {
          user_id: workerId,
          worker_id: payload?.worker_id ?? null,
          username: payload?.username ?? "",
          email: profileData.email || payload?.email || "",
          phone_number: profileData.phone_number || payload?.phone_number || "",
          name: profileData.name || payload?.name || payload?.fullname || "",
          lastname: profileData.lastname || payload?.lastname || "",
          role: payload?.role,
          bio: profileData.bio || payload?.bio || "",
          specialty: profileData.specialty || payload?.specialty || "",
          hourly_rate: profileData.hourly_rate || payload?.hourly_rate || "",
          experience_years: profileData.experience_years || payload?.experience_years || "",
        };

        setWorker(workerData);
        setProfileForm({
          name: workerData.name || "",
          lastname: workerData.lastname || "",
          email: workerData.email || "",
          phone_number: workerData.phone_number || "",
          bio: workerData.bio || "",
          specialty: workerData.specialty || "",
          experience_years: workerData.experience_years || "",
        });

        setPendingServices(
          servicesResponse.status === "fulfilled" ? normalizeIncomingServices(listFromResponse(servicesResponse.value)) : []
        );
        setHistory(historyResponse.status === "fulfilled" ? normalizeIncomingServices(listFromResponse(historyResponse.value)) : []);

        try {
          const paymentsRes = await api.get("/payments");
          setPayments(filterHiddenServices(listFromResponse(paymentsRes)));
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

    const intervalId = setInterval(() => {
      if (mounted) {
        const refreshData = async () => {
          try {
            const [servicesRes, historyRes] = await Promise.allSettled([
              api.get("/workers/me/services"),
              api.get("/workers/me/history"),
            ]);
            if (mounted) {
              if (servicesRes.status === "fulfilled") setPendingServices(normalizeIncomingServices(listFromResponse(servicesRes.value)));
              if (historyRes.status === "fulfilled") setHistory(normalizeIncomingServices(listFromResponse(historyRes.value)));
            }
          } catch (_) {}
        };
        refreshData();
      }
    }, 10000);

    const handleProfileUpdated = (e) => {
      try {
        setPendingServices((prev) => (prev || []).map(enrichServiceWithClientProfile));
        setHistory((prev) => (prev || []).map(enrichServiceWithClientProfile));
        // intentar también recargar override del worker
        const raw = localStorage.getItem(`worker_profile_${worker?.worker_id ?? worker?.user_id}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setWorker((prev) => ({ ...prev, ...parsed }));
          } catch (_) {}
        }
      } catch (_) {}
    };

    const handleStorage = (e) => {
      try {
        if (!e?.key) return;
        if (e.key.startsWith("client_profile_") || e.key.startsWith("user_profile_") || e.key === "user_profile_me") {
          setPendingServices((prev) => (prev || []).map(enrichServiceWithClientProfile));
          setHistory((prev) => (prev || []).map(enrichServiceWithClientProfile));
          return;
        }
        if (e.key.startsWith("worker_profile_")) {
          const raw = localStorage.getItem(e.key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              setWorker((prev) => ({ ...prev, ...parsed }));
            } catch (_) {}
          }
        }
      } catch (_) {}
    };

    window.addEventListener("profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleStorage);
    };
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
      name: profileForm.name?.trim() || worker?.name || "",
      lastname: profileForm.lastname?.trim() || worker?.lastname || "",
      email: profileForm.email?.trim() || worker?.email || "",
      phone_number: profileForm.phone_number?.trim() || worker?.phone_number || "",
      bio: profileForm.bio?.trim() || worker?.bio || "",
      hourly_rate: Number(profileForm.hourly_rate || 0),
      specialty: profileForm.specialty?.trim() || worker?.specialty || "",
      experience_years: Number(profileForm.experience_years || 0),
    };

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

      // Usar /workers/me/profile para editar el perfil del trabajador autenticado
      await api.put(`/workers/me/profile`, payload);

      setWorker((prev) => ({ ...prev, ...payload }));
      try {
        // Guardar una copia local para sincronización instantánea en vistas públicas
        localStorage.setItem(`worker_profile_${workerId}`, JSON.stringify(payload));
      } catch (_) {}
      try {
        window.dispatchEvent(new CustomEvent("worker-profile-updated", { detail: { worker_id: workerId } }));
      } catch (_) {}
      try {
        localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "worker-profile", id: workerId }));
      } catch (_) {}
      try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
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

  const sendQuote = async (serviceId) => {
    const value = quoteInputs[serviceId];
    const amount = Number(value || 0);
    if (amount <= 0) {
      setError("Ingresa un monto válido para la cotización.");
      return;
    }

    try {
      setSendingQuoteId(serviceId);
      setError("");
      setSuccess("");

      // Usar la nueva ruta recomendada por el backend: POST /services/:id/quote
      await api.post(`/services/${serviceId}/quote`, { estimated_price: amount });

      // Refrescar lista de servicios del trabajador
      try {
        const res = await api.get('/workers/me/services');
        setPendingServices(listFromResponse(res));
      } catch (_) {}

      setSuccess(`Cotización enviada para el servicio #${serviceId}.`);
      setQuoteInputs((prev) => ({ ...prev, [serviceId]: '' }));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSendingQuoteId(null);
    }
  };

  const deleteHistory = async (historyItem) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro del historial?")) return;

    const historyId = historyItem?.history_id ?? historyItem?.service_id ?? historyItem?.id;
    const serviceId = historyItem?.service_id ?? historyItem?.history_id ?? historyItem?.id;

    if (!historyId) {
      setError("ID inválido para eliminar historial.");
      return;
    }

    hideHistoryServiceId(serviceId);
    setHistory((prev) => prev.filter((h) => (h.history_id ?? h.service_id ?? h.id) !== historyId));
    setPayments((prev) => prev.filter((payment) => (payment.service_id ?? payment.history_id ?? payment.id) !== serviceId));
    setPendingServices((prev) => prev.filter((service) => (service.service_id ?? service.history_id ?? service.id) !== serviceId));
    try {
      localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "history-delete", id: serviceId }));
    } catch (_) {}
    try {
      window.dispatchEvent(new Event("app-data-updated"));
    } catch (_) {}
    setSuccess("Historial eliminado de esta vista.");
  };

  const openHistoryDetails = (historyItem) => {
    setSelectedHistoryItem(historyItem);
  };

  const closeHistoryDetails = () => {
    setSelectedHistoryItem(null);
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
        try {
          localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "payment-saved" }));
        } catch (_) {}
        try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
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
      try {
        localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "payment-delete", id: paymentId }));
      } catch (_) {}
      try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const getAddress = (service) => {
    try {
      // Si el backend responde explícitamente con address_id null
      if (Object.prototype.hasOwnProperty.call(service, "address_id") && (service.address_id === null || service.address_id === undefined)) {
        return "Domicilio no disponible (no asociado en backend)";
      }
    } catch (_) {}
    const normalizeValue = (value) => {
      if (value === null || value === undefined) return "";
      if (typeof value !== "string") return String(value).trim();
      return value.trim();
    };

    const joinParts = (...parts) => parts.map(normalizeValue).filter(Boolean).join(", ");

    const directCandidates = [
      service?.full_address,
      service?.address,
      service?.domicilio,
      service?.direccion,
      service?.client_address,
      service?.client_full_address,
      service?.client_location,
      service?.service_address,
      service?.location,
      service?.address_line,
      service?.address_line1,
      service?.street_address,
      service?.customer_address,
      service?.user_address,
    ];

    const nestedCandidates = [
      service?.client?.address,
      service?.client?.full_address,
      service?.client?.domicilio,
      service?.customer?.address,
      service?.user?.address,
      service?.profile?.address,
    ];

    const compositeCandidates = [
      joinParts(service?.client_address, service?.client_city, service?.client_state),
      joinParts(service?.address_line, service?.city_name, service?.state_name),
      joinParts(service?.street_name, service?.ext_number, service?.city_name, service?.state_name),
      joinParts(service?.client?.address, service?.client?.city, service?.client?.state),
      joinParts(service?.customer?.address, service?.customer?.city, service?.customer?.state),
      joinParts(service?.user?.address, service?.user?.city, service?.user?.state),
    ];

    const firstFound = [...directCandidates, ...nestedCandidates, ...compositeCandidates]
      .map(normalizeValue)
      .find(Boolean);

    return firstFound || "Domicilio no disponible";
  };

  const getClientPhone = (service) => {
    return (
      service.address_phone_number ||
      service.client_phone ||
      service.phone_number ||
      service.customer_phone ||
      service.user_phone ||
      "N/A"
    );
  };

  const getClientEmail = (service) => {
    return (
      service.client_email ||
      service.email ||
      service.customer_email ||
      service.user_email ||
      "N/A"
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
  const completedJobs = useMemo(() => {
    return history.filter((s) => serviceStatusLower(s) === "completado" || statusLower(s.payment_status) === "completado").length;
  }, [history]);

  const canceledJobs = useMemo(() => {
    return [...pendingServices, ...history].filter((s) => serviceStatusLower(s) === "cancelado").length;
  }, [pendingServices, history]);

  const averageCompletedTicket = useMemo(() => {
    return completedJobs > 0 ? totalCollected / completedJobs : 0;
  }, [completedJobs, totalCollected]);

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
                style={{ width: 80, height: 80 }}
              />
              <h5 className="fw-bold mb-1">{worker?.name ? `${worker.name} ${worker?.lastname || ""}`.trim() : "Mi Panel"}</h5>
              <p className="text-primary fw-semibold mb-2">{worker?.specialty || "Profesional"}</p>

              <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                <span className="badge bg-primary-subtle text-primary">{worker?.experience_years || 0} años exp.</span>
                <span className="badge bg-success-subtle text-success">{completedJobs} completados</span>
                <span className="badge bg-warning-subtle text-warning">{pendingServices.length} activos</span>
              </div>

              <div className="text-start small mb-3">
                {worker?.email && (
                  <div className="d-flex justify-content-between gap-2 mb-1">
                    <span className="text-muted">Email</span>
                    <span className="fw-semibold text-break text-end">{worker.email}</span>
                  </div>
                )}
                {worker?.phone_number && (
                  <div className="d-flex justify-content-between gap-2 mb-1">
                    <span className="text-muted">Teléfono</span>
                    <span className="fw-semibold text-break text-end">{worker.phone_number}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between gap-2 mb-1">
                  <span className="text-muted">Cotización base</span>
                  <span className="fw-semibold text-end">${Number(worker?.hourly_rate || 0).toLocaleString()}</span>
                </div>
                <div className="d-flex justify-content-between gap-2 mb-1">
                  <span className="text-muted">Promedio cobrado</span>
                  <span className="fw-semibold text-end">${averageCompletedTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="row g-2 mb-3 text-muted small">
                <div className="col-6">
                  <div className="p-2 bg-light rounded text-center">
                    <div className="fw-bold">{pendingServices.length}</div>
                    <div>Trabajos</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-light rounded text-center">
                    <div className="fw-bold">{history.length}</div>
                    <div>Historial</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-light rounded text-center">
                    <div className="fw-bold">${totalCollected.toLocaleString()}</div>
                    <div>Cobrado</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-light rounded text-center">
                    <div className="fw-bold">${pendingAmount.toLocaleString()}</div>
                    <div>Pendiente</div>
                  </div>
                </div>
              </div>

              <div className="text-muted small mb-3">
                <p className="mb-1">Total trabajos: {totalJobs}</p>
                <p className="mb-1">Completados: {completedJobs}</p>
                <p className="mb-1">Cancelados: {canceledJobs}</p>
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
                  {/* username eliminado según solicitud */}
                  <div className="col-12 col-md-6">
                    <label className="form-label">Email</label>
                    <input className="form-control" name="email" type="email" value={profileForm.email} onChange={handleProfileInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Teléfono</label>
                    <input className="form-control" name="phone_number" value={profileForm.phone_number} onChange={handleProfileInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Profesión / Especialidad</label>
                    <input
                      className="form-control"
                      name="specialty"
                      type="text"
                      value={profileForm.specialty}
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

              {/* Removed payment registration and payments list per request. Only summary and details remain. */}

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
                          <th>Cotizacion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...pendingServices, ...history].map((service, idx) => (
                          <tr key={`service-${service.history_id ?? service.service_id ?? service.id}-${idx}`}>
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
                                  <span><strong>Teléfono:</strong> {getClientPhone(service)}</span>
                                  <span><strong>Correo:</strong> {getClientEmail(service)}</span>
                                  <span><strong>Cotizacion:</strong> ${service.estimated_price || "Pendiente de cotizacion"}</span>
                                  {/* Domicilio removido según solicitud */}
                                </div>
                                <div className="mt-3 d-flex gap-2 align-items-center">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    placeholder="Monto de la cotización"
                                    value={quoteInputs[service.service_id] || ''}
                                    onChange={(e) => setQuoteInputs(prev => ({ ...prev, [service.service_id]: e.target.value }))}
                                    step="0.01"
                                    min="0"
                                    style={{maxWidth: 160}}
                                  />
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => sendQuote(service.service_id)}
                                    disabled={sendingQuoteId === service.service_id}
                                  >
                                    {sendingQuoteId === service.service_id ? 'Enviando...' : 'Enviar cotización'}
                                  </button>
                                </div>
                              </div>
                              <div className="col-auto">
                                <button className="btn btn-sm btn-outline-secondary" disabled>
                                  En espera de aceptacion del cliente
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
                  <h4 className="mb-3 mt-4">Trabajos en progreso ({onlyAcceptedServices.length})</h4>
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
                                  <span><strong>Teléfono:</strong> {getClientPhone(service)}</span>
                                  <span><strong>Cotizacion:</strong> ${service.estimated_price || "Pendiente de cotizacion"}</span>
                                  {/* Domicilio removido según solicitud */}
                                </div>
                              </div>
                              <div className="col-auto">
                                <div className="btn-group-vertical gap-1 d-flex">
                                  {serviceStatusLower(service) === "aceptado" ? (
                                    <button className="btn btn-sm btn-primary" onClick={() => updateServiceStatus(service.service_id, "En progreso")}>
                                      Iniciar servicio
                                    </button>
                                  ) : (
                                    <button className="btn btn-sm btn-success" onClick={() => updateServiceStatus(service.service_id, "Completado")}>
                                      Marcar completado
                                    </button>
                                  )}
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => cancelService(service.service_id)}>
                                    Cancelar
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
                  <h4 className="mb-3 mt-4">Historial de trabajos ({history.length})</h4>
                  <div className="row g-3">
                    {history.map((service, idx) => (
                      <div key={`history-${service.history_id ?? service.service_id ?? service.id}-${idx}`} className="col-12">
                        <div className="card shadow-sm border-0">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h5 className="fw-bold mb-1">Trabajo #{service.service_id}</h5>
                                <p className="text-muted mb-1">{service.description}</p>
                                <div className="small text-muted">
                                  <span className="me-3"><strong>Cliente:</strong> {service.client_name || service.customer_name || '-'}</span>
                                  <span className="me-3"><strong>Estado:</strong> {getServiceStatusLabel(service) || service.payment_status || '-'}</span>
                                  <span className="me-3"><strong>Cotizacion final:</strong> ${Number(service.amount ?? service.estimated_price ?? service.total_amount ?? 0).toLocaleString()}</span>
                                  {/* Domicilio removido según solicitud */}
                                </div>
                              </div>
                              <div className="btn-group-vertical">
                                <button className="btn btn-sm btn-outline-primary mb-1" onClick={() => openHistoryDetails(service)}>
                                  Ver detalles
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteHistory(service)}>Eliminar</button>
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

          {selectedHistoryItem && (
            <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content border-0 shadow">
                  <div className="modal-header">
                    <h5 className="modal-title">Detalles del historial #{selectedHistoryItem.service_id}</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeHistoryDetails}></button>
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <div className="p-3 bg-light rounded">
                          <div className="text-muted small">Cliente</div>
                          <div className="fw-semibold">{selectedHistoryItem.client_name || selectedHistoryItem.customer_name || "Sin nombre"}</div>
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="p-3 bg-light rounded">
                          <div className="text-muted small">Estado</div>
                          <div className="fw-semibold">{getServiceStatusLabel(selectedHistoryItem)}</div>
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="p-3 bg-light rounded">
                          <div className="text-muted small">Cotización final</div>
                          <div className="fw-semibold">${Number(selectedHistoryItem.amount ?? selectedHistoryItem.estimated_price ?? selectedHistoryItem.total_amount ?? 0).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="p-3 bg-light rounded">
                          <div className="text-muted small mb-2">Descripción completa</div>
                          <div>{selectedHistoryItem.description || "Sin descripción disponible."}</div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="p-3 bg-light rounded">
                          <div className="text-muted small mb-2">Datos adicionales</div>
                          <div className="small text-muted">
                            <div><strong>Teléfono:</strong> {getClientPhone(selectedHistoryItem)}</div>
                            <div><strong>Correo:</strong> {getClientEmail(selectedHistoryItem)}</div>
                            <div><strong>Servicio:</strong> #{selectedHistoryItem.service_id}</div>
                            <div><strong>Pago:</strong> {selectedHistoryItem.payment_status || "Pendiente"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeHistoryDetails}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
