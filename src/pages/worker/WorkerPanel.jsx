import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, itemFromResponse, listFromResponse } from "../../api/normalize";

export default function WorkerPanel() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const hiddenHistoryStorageKey = "worker_hidden_history_service_ids";
  const defaultAddressStorageKey = "worker_default_address_id";

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
    address_id: "",
  });
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({
    entity_type: "worker",
    address_type: "work",
    postal_code_id: "",
    street_name: "",
    ext_number: "",
    int_number: "",
    phone_number: "",
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [saveAddressAsDefault, setSaveAddressAsDefault] = useState(false);
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
        localStorage.setItem("hidden_history_service_ids", JSON.stringify(current));
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
    };
  };

  const getAddressLabel = (address) => {
    if (!address) return "Domicilio no disponible";
    if (typeof address === "string") return address;

    const lineOne = [address.street_name, address.ext_number, address.int_number].filter(Boolean).join(" ");
    const lineTwo = [address.city_name, address.state_name, address.country_name].filter(Boolean).join(", ");
    const parts = [lineOne, lineTwo, address.postal_code ? `CP ${address.postal_code}` : ""].filter(Boolean);

    return parts.length > 0 ? parts.join(" - ") : "Domicilio no disponible";
  };

  const getServiceAddressDetail = (address) => {
    if (!address) return "Domicilio no disponible";
    const parts = [
      [address.street_name, address.ext_number, address.int_number].filter(Boolean).join(" "),
      [address.settlement_name, address.city_name, address.state_name, address.country_name].filter(Boolean).join(", "),
      address.postal_code ? `CP ${address.postal_code}` : "",
      address.phone_number ? `Tel. ${address.phone_number}` : "",
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : "Domicilio no disponible";
  };

  const formatCompactAddress = (address) => {
    if (!address) return "Domicilio no disponible";
    if (typeof address === "string") return address;

    const streetLine = [address.street_name, address.ext_number, address.int_number ? `Int ${address.int_number}` : ""]
      .filter(Boolean)
      .join(" ")
      .trim();

    const cityName = address.city_name ?? "";
    const parts = [streetLine, cityName].filter(Boolean);
    return parts.length > 0 ? `${parts[0] || ""}${parts[1] ? `, ${parts[1]}` : ""}`.trim() : "Domicilio no disponible";
  };

  const getServiceTimeline = (service) => service?.timeline ?? service ?? {};

  const getWorkerProfileStorageKeys = (workerData, workerId) => {
    const keys = new Set();
    const normalizedWorkerId = workerId ? String(workerId) : "";
    const workerKey = workerData?.worker_id ? String(workerData.worker_id) : "";
    const userKey = workerData?.user_id ? String(workerData.user_id) : "";

    if (normalizedWorkerId) keys.add(`worker_profile_${normalizedWorkerId}`);
    if (workerKey) keys.add(`worker_profile_${workerKey}`);
    if (userKey) keys.add(`worker_profile_${userKey}`);

    return Array.from(keys);
  };

  const formatDisplayDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const getServiceClientAddress = (service) => {
    return (
      service?.address ??
      service?.client_address ??
      service?.customer_address ??
      service?.user_address ??
      service?.service_address ??
      service?.delivery_address ??
      service?.request_address ??
      null
    );
  };

  const getServiceTimelineValue = (service, key) => {
    const timeline = getServiceTimeline(service);
    const timelineKeys = {
      request_date: ["request_date", "requested_at", "created_at"],
      accepted_at: ["accepted_at", "accepted_date", "accepted_on"],
      started_at: ["started_at", "started_date", "started_on"],
      finished_at: ["finished_at", "finished_date", "completed_at", "completed_on"],
    };
    const keys = timelineKeys[key] || [key];

    for (const source of [timeline, service]) {
      for (const candidateKey of keys) {
        const value = source?.[candidateKey];
        if (value) return formatDisplayDate(value);
      }
    }

    return "-";
  };

  const getTimelineValue = (service, key) => {
    return getServiceTimelineValue(service, key);
  };

  const syncDefaultAddress = async (addressId) => {
    const normalizedId = addressId ? String(addressId) : "";
    await api.put("/workers/me/profile", { address_id: normalizedId ? Number(normalizedId) : null });
    setProfileForm((prev) => ({ ...prev, address_id: normalizedId }));
    setWorker((prev) => (prev ? { ...prev, address_id: normalizedId ? Number(normalizedId) : null } : prev));
    try {
      localStorage.setItem(defaultAddressStorageKey, normalizedId);
      const storedProfile = JSON.parse(localStorage.getItem(`worker_profile_${worker?.worker_id ?? worker?.user_id}`) || "{}");
      const updatedProfile = { ...storedProfile, address_id: normalizedId ? Number(normalizedId) : null };
      if (worker?.worker_id ?? worker?.user_id) {
        for (const storageKey of getWorkerProfileStorageKeys(worker, worker?.worker_id ?? worker?.user_id)) {
          localStorage.setItem(storageKey, JSON.stringify(updatedProfile));
        }
      }
    } catch (_) {}
  };

  const clearAddressForm = () => {
    setAddressForm({
      entity_type: "worker",
      address_type: "work",
      postal_code_id: "",
      street_name: "",
      ext_number: "",
      int_number: "",
      phone_number: "",
    });
    setEditingAddressId(null);
    setSaveAddressAsDefault(false);
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

  const refreshWorkerServices = async (mounted = true) => {
    const [servicesRes, historyRes] = await Promise.allSettled([
      api.get("/workers/me/services"),
      api.get("/workers/me/history"),
    ]);

    if (!mounted) return;

    if (servicesRes.status === "fulfilled") {
      setPendingServices(normalizeIncomingServices(listFromResponse(servicesRes.value)));
    }

    if (historyRes.status === "fulfilled") {
      setHistory(normalizeIncomingServices(listFromResponse(historyRes.value)));
    }
  };

  const fetchServiceById = async (serviceId) => {
    const response = await api.get(`/services/${serviceId}`);
    const service = itemFromResponse(response) || response?.data?.data || response?.data || null;
    return service;
  };

  const upsertWorkerService = (serviceData) => {
    if (!serviceData) return;
    const serviceId = serviceData.service_id ?? serviceData.id;
    if (!serviceId) return;

    const normalized = enrichServiceWithClientProfile(serviceData);

    setPendingServices((prev) => {
      const exists = prev.some((service) => (service.service_id ?? service.id) === serviceId);
      if (!exists) return prev;
      return prev.map((service) => ((service.service_id ?? service.id) === serviceId ? { ...service, ...normalized } : service));
    });

    setHistory((prev) => {
      const exists = prev.some((service) => (service.service_id ?? service.id) === serviceId);
      if (!exists) return prev;
      return prev.map((service) => ((service.service_id ?? service.id) === serviceId ? { ...service, ...normalized } : service));
    });

    setSelectedHistoryItem((prev) => {
      if (!prev) return prev;
      const prevId = prev.service_id ?? prev.id;
      return prevId === serviceId ? { ...prev, ...normalized } : prev;
    });

    setWorker((prev) => {
      if (!prev?.latest_service) return prev;
      const prevLatestId = prev.latest_service.service_id ?? prev.latest_service.id;
      return prevLatestId === serviceId ? { ...prev, latest_service: { ...prev.latest_service, ...normalized } } : prev;
    });
  };

  const broadcastDataUpdated = (type, id) => {
    try {
      localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type, id }));
    } catch (_) {}
    try {
      window.dispatchEvent(new Event("app-data-updated"));
    } catch (_) {}
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

        const [servicesResponse, historyResponse, profileResponse, addressesResponse] = await Promise.allSettled([
          api.get("/workers/me/services"),
          api.get("/workers/me/history"),
          api.get("/workers/me/profile"),
          api.get("/addresses"),
        ]);

        if (!mounted) return;

        const localProfile = (() => {
          try {
            const key = `worker_profile_${workerId}`;
            return JSON.parse(localStorage.getItem(key) || "{}");
          } catch (_) {
            return {};
          }
        })();
        const remoteProfile = profileResponse.status === "fulfilled" ? itemFromResponse(profileResponse.value) || {} : {};
        const profileData = {
          ...localProfile,
          ...remoteProfile,
          address: remoteProfile?.address ?? localProfile?.address ?? null,
        };

        setAddresses(
          addressesResponse.status === "fulfilled"
            ? listFromResponse(addressesResponse.value).filter((address) => !address?.entity_type || address.entity_type === "worker")
            : []
        );

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
          address_id: profileData.address_id || profileData.address?.address_id || localStorage.getItem(defaultAddressStorageKey) || payload?.address_id || "",
          latest_service: profileData.latest_service || null,
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
          address_id: workerData.address_id || "",
        });

        if (profileData.address) {
          setAddressForm({
            entity_type: profileData.address.entity_type || "worker",
            address_type: profileData.address.address_type || "work",
            postal_code_id: profileData.address.postal_code_id || "",
            street_name: profileData.address.street_name || "",
            ext_number: profileData.address.ext_number || "",
            int_number: profileData.address.int_number || "",
            phone_number: profileData.address.phone_number || "",
          });
          setEditingAddressId(profileData.address.address_id || null);
        }

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
        refreshWorkerServices(mounted).catch(() => {});
      }
    }, 10000);

    const handleFocus = () => {
      refreshWorkerServices(mounted).catch(() => {});
    };

    const handleAppDataUpdated = () => {
      refreshWorkerServices(mounted).catch(() => {});
    };

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
    window.addEventListener("focus", handleFocus);
    window.addEventListener("app-data-updated", handleAppDataUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("profile-updated", handleProfileUpdated);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("app-data-updated", handleAppDataUpdated);
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
      address_id: profileForm.address_id ? Number(profileForm.address_id) : null,
    };

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

      const response = await api.put(`/workers/me/profile`, payload);
      const savedProfile = itemFromResponse(response) || {};
      const workerProfileStorageKey = `worker_profile_${workerId}`;
      const mergedProfile = {
        ...worker,
        ...savedProfile,
        user_id: workerId,
        worker_id: worker?.worker_id ?? null,
        name: profileForm.name?.trim() || savedProfile.name || worker?.name || "",
        lastname: profileForm.lastname?.trim() || savedProfile.lastname || worker?.lastname || "",
        email: profileForm.email?.trim() || savedProfile.email || worker?.email || "",
        phone_number: profileForm.phone_number?.trim() || savedProfile.phone_number || worker?.phone_number || "",
        bio: profileForm.bio?.trim() || savedProfile.bio || worker?.bio || "",
        specialty: profileForm.specialty?.trim() || savedProfile.specialty || worker?.specialty || "",
        experience_years:
          profileForm.experience_years !== ""
            ? Number(profileForm.experience_years)
            : savedProfile.experience_years ?? worker?.experience_years ?? "",
        hourly_rate: savedProfile.hourly_rate ?? worker?.hourly_rate ?? "",
        address_id: payload.address_id,
        address: savedProfile?.address || worker?.address || null,
        latest_service: savedProfile?.latest_service || worker?.latest_service || null,
      };

      setWorker(mergedProfile);
      try {
        // Guardar una copia local para sincronización instantánea en vistas públicas
        for (const storageKey of getWorkerProfileStorageKeys(worker, workerId)) {
          localStorage.setItem(storageKey, JSON.stringify(mergedProfile));
        }
        localStorage.setItem(defaultAddressStorageKey, payload.address_id ? String(payload.address_id) : "");
      } catch (_) {}
      try {
        window.dispatchEvent(new CustomEvent("worker-profile-updated", { detail: { worker_id: workerId } }));
      } catch (_) {}
      try {
        localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "worker-profile", id: workerId }));
      } catch (_) {}
      try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
      setSuccess("Dirección por defecto actualizada correctamente.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddressInput = (event) => {
    const { name, value } = event.target;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveAddress = async (event) => {
    event.preventDefault();

    const payload = {
      entity_type: addressForm.entity_type || "worker",
      address_type: addressForm.address_type || "work",
      postal_code_id: Number(addressForm.postal_code_id),
      street_name: addressForm.street_name?.trim() || "",
      ext_number: addressForm.ext_number?.trim() || "",
      int_number: addressForm.int_number?.trim() || null,
      phone_number: addressForm.phone_number?.trim() || "",
    };

    try {
      setSavingAddress(true);
      setError("");
      setSuccess("");

      const response = editingAddressId
        ? await api.put(`/addresses/${editingAddressId}`, payload)
        : await api.post("/addresses", payload);

      const savedAddress = itemFromResponse(response) || response?.data?.data || response?.data || {};
      const savedAddressId = savedAddress?.address_id || editingAddressId;

      if (saveAddressAsDefault && savedAddressId) {
        await syncDefaultAddress(savedAddressId);
      }

      const refreshedAddresses = await api.get("/addresses").then((res) => listFromResponse(res).filter((address) => !address?.entity_type || address.entity_type === "worker"));
      setAddresses(refreshedAddresses);

      if (savedAddressId) {
        setProfileForm((prev) => ({ ...prev, address_id: String(savedAddressId) }));
      }
      clearAddressForm();
      setSuccess(editingAddressId ? "Dirección actualizada correctamente." : "Dirección creada correctamente.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingAddress(false);
    }
  };

  const editAddress = (address) => {
    setAddressForm({
      entity_type: address?.entity_type || "worker",
      address_type: address?.address_type || "work",
      postal_code_id: address?.postal_code_id || "",
      street_name: address?.street_name || "",
      ext_number: address?.ext_number || "",
      int_number: address?.int_number || "",
      phone_number: address?.phone_number || "",
    });
    setEditingAddressId(address?.address_id || null);
    setSaveAddressAsDefault(true);
  };

  const updateServiceStatus = async (serviceId, newStatus) => {
    try {
      setError("");
      setSuccess("");
      await api.patch(`/services/${serviceId}/status`, { status_name: newStatus });
      const updatedService = await fetchServiceById(serviceId).catch(() => null);
      if (updatedService) upsertWorkerService(updatedService);
      else await refreshWorkerServices();
      broadcastDataUpdated("service-status", serviceId);
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

      const updatedService = await fetchServiceById(serviceId).catch(() => null);
      if (updatedService) upsertWorkerService(updatedService);
      else await refreshWorkerServices();
      broadcastDataUpdated("service-cancel", serviceId);
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
      const updatedService = await fetchServiceById(serviceId).catch(() => null);
      if (updatedService) upsertWorkerService(updatedService);
      else await refreshWorkerServices();
      broadcastDataUpdated("service-quote", serviceId);

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

  const openHistoryDetails = async (historyItem) => {
    setSelectedHistoryItem(historyItem);
    const serviceId = historyItem?.service_id ?? historyItem?.id;
    if (!serviceId) return;

    try {
      const freshService = await fetchServiceById(serviceId);
      if (freshService) {
        upsertWorkerService(freshService);
        setSelectedHistoryItem((prev) => (prev ? { ...prev, ...freshService } : freshService));
      }
    } catch (_) {}
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

  const getAddress = (service) => getServiceAddressDetail(service?.address);
  const getClientAddress = (service) => formatCompactAddress(getServiceClientAddress(service));

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

  const getServiceQuoteAmount = (service) => {
    const candidates = [
      service?.estimated_price,
      service?.latest_quote?.amount,
      service?.latest_quote?.estimated_price,
      service?.quote?.amount,
      service?.quote?.estimated_price,
      service?.amount,
      service?.total_amount,
    ];

    const value = candidates.find((candidate) => {
      const numeric = Number(candidate);
      return candidate !== undefined && candidate !== null && candidate !== "" && Number.isFinite(numeric) && numeric > 0;
    });

    return Number(value ?? 0);
  };

  const totalCollected = useMemo(() => {
    return history
      .filter((s) => statusLower(s.payment_status) === "completado" || serviceStatusLower(s) === "completado")
      .reduce((acc, s) => acc + getServiceQuoteAmount(s), 0);
  }, [history]);

  const pendingAmount = useMemo(() => {
    return pendingServices
      .filter((s) => {
        const payment = statusLower(s.payment_status);
        return payment !== "completado" && payment !== "paid";
      })
      .reduce((acc, s) => acc + getServiceQuoteAmount(s), 0);
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
        amount: getServiceQuoteAmount(s),
      })),
      ...history.map((h) => ({
        service_id: h.service_id,
        display: `#${h.service_id} - ${h.client_name || "Cliente"} (${getServiceStatusLabel(h)})`,
        amount: getServiceQuoteAmount(h),
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
            <>
              {worker?.latest_service ? (
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-body">
                    <h5 className="mb-3">Último servicio</h5>
                    <div className="small text-muted mb-2">
                      <div><strong>Servicio:</strong> #{worker.latest_service.service_id ?? worker.latest_service.id ?? "-"}</div>
                      <div><strong>Estado:</strong> {getServiceStatusLabel(worker.latest_service)}</div>
                      <div><strong>Dirección:</strong> {getClientAddress(worker.latest_service)}</div>
                      <div><strong>Solicitado:</strong> {getTimelineValue(worker.latest_service, "request_date")}</div>
                      <div><strong>Aceptado:</strong> {getTimelineValue(worker.latest_service, "accepted_at")}</div>
                      <div><strong>Iniciado:</strong> {getTimelineValue(worker.latest_service, "started_at")}</div>
                      <div><strong>Terminado:</strong> {getTimelineValue(worker.latest_service, "finished_at")}</div>
                    </div>
                  </div>
                </div>
              ) : null}

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
                  <div className="col-12">
                    <label className="form-label">Dirección</label>
                    <select className="form-select" name="address_id" value={profileForm.address_id} onChange={handleProfileInput}>
                      <option value="">Usar la dirección guardada por defecto</option>
                      {addresses.map((address) => (
                        <option key={address.address_id} value={address.address_id}>
                          #{address.address_id} - {getAddressLabel(address)}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">Esta dirección se usará para las solicitudes asociadas a tu perfil.</div>
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
            </>
          ) : null}

          {activeTab === "perfil" ? (
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <h5 className="mb-1">Direcciones guardadas</h5>
                    <p className="text-muted small mb-0">Crea o edita una dirección y, si quieres, guárdala como dirección por defecto.</p>
                  </div>
                  {profileForm.address_id ? <span className="badge bg-primary">Default: #{profileForm.address_id}</span> : null}
                </div>

                <form onSubmit={saveAddress} className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Entity type</label>
                    <input className="form-control" name="entity_type" value={addressForm.entity_type} onChange={handleAddressInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Address type</label>
                    <input className="form-control" name="address_type" value={addressForm.address_type} onChange={handleAddressInput} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Postal code ID</label>
                    <input className="form-control" type="number" name="postal_code_id" value={addressForm.postal_code_id} onChange={handleAddressInput} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Street name</label>
                    <input className="form-control" name="street_name" value={addressForm.street_name} onChange={handleAddressInput} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Ext number</label>
                    <input className="form-control" name="ext_number" value={addressForm.ext_number} onChange={handleAddressInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Int number</label>
                    <input className="form-control" name="int_number" value={addressForm.int_number} onChange={handleAddressInput} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Phone number</label>
                    <input className="form-control" name="phone_number" value={addressForm.phone_number} onChange={handleAddressInput} />
                  </div>
                  <div className="col-12 d-flex gap-3 align-items-center flex-wrap">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="saveDefaultWorkerAddress" checked={saveAddressAsDefault} onChange={(e) => setSaveAddressAsDefault(e.target.checked)} />
                      <label className="form-check-label" htmlFor="saveDefaultWorkerAddress">Guardar como dirección por defecto</label>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={savingAddress}>
                      {savingAddress ? "Guardando..." : editingAddressId ? "Actualizar dirección" : "Crear dirección"}
                    </button>
                    {editingAddressId ? (
                      <button type="button" className="btn btn-outline-secondary" onClick={clearAddressForm}>
                        Cancelar edición
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="table-responsive mt-4">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Dirección</th>
                        <th>Tipo</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addresses.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-muted">No hay direcciones guardadas.</td>
                        </tr>
                      ) : addresses.map((address) => (
                        <tr key={address.address_id}>
                          <td>#{address.address_id}</td>
                          <td>{getAddressLabel(address)}</td>
                          <td>{address.address_type || "-"}</td>
                          <td className="d-flex gap-2 flex-wrap">
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => editAddress(address)}>Editar</button>
                            <button type="button" className="btn btn-sm btn-outline-success" onClick={() => syncDefaultAddress(address.address_id)}>Usar por defecto</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                                  <span><strong>Tipo:</strong> {service.service_type_name || service.service_type_id || "-"}</span>
                                  <span><strong>Cotización:</strong> {getServiceQuoteAmount(service) > 0 ? `$${getServiceQuoteAmount(service).toLocaleString()}` : "Pendiente de cotización"}</span>
                                  <span><strong>Dirección:</strong> {getClientAddress(service)}</span>
                                  <span><strong>Pedido:</strong> {getTimelineValue(service, "request_date")}</span>
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
                                  <span><strong>Tipo:</strong> {service.service_type_name || service.service_type_id || "-"}</span>
                                  <span><strong>Cotización:</strong> {getServiceQuoteAmount(service) > 0 ? `$${getServiceQuoteAmount(service).toLocaleString()}` : "Pendiente de cotización"}</span>
                                  <span><strong>Dirección:</strong> {getClientAddress(service)}</span>
                                  <span><strong>Inicio:</strong> {getTimelineValue(service, "started_at")}</span>
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
                                  <span className="me-3"><strong>Cotización final:</strong> {getServiceQuoteAmount(service) > 0 ? `$${getServiceQuoteAmount(service).toLocaleString()}` : "Pendiente"}</span>
                                  <span className="me-3"><strong>Dirección:</strong> {getClientAddress(service)}</span>
                                  <span className="me-3"><strong>Solicitado:</strong> {getTimelineValue(service, "request_date")}</span>
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
                          <div className="fw-semibold">{getServiceQuoteAmount(selectedHistoryItem) > 0 ? `$${getServiceQuoteAmount(selectedHistoryItem).toLocaleString()}` : "Pendiente"}</div>
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
                            <div><strong>Tipo:</strong> {selectedHistoryItem.service_type_name || selectedHistoryItem.service_type_id || "-"}</div>
                            <div><strong>Worker:</strong> {selectedHistoryItem.worker_name ? `${selectedHistoryItem.worker_name} ${selectedHistoryItem.worker_lastname || ''}` : "Tú"}</div>
                            <div><strong>Worker email:</strong> {selectedHistoryItem.worker_email || "-"}</div>
                            <div><strong>Cotización:</strong> {getServiceQuoteAmount(selectedHistoryItem) > 0 ? `$${getServiceQuoteAmount(selectedHistoryItem).toLocaleString()}` : "Pendiente"}</div>
                            <div><strong>Pago:</strong> {selectedHistoryItem.payment_status || "Pendiente"}</div>
                            <div><strong>Dirección:</strong> {getClientAddress(selectedHistoryItem)}</div>
                            <div><strong>Solicitado:</strong> {getTimelineValue(selectedHistoryItem, "request_date")}</div>
                            <div><strong>Aceptado:</strong> {getTimelineValue(selectedHistoryItem, "accepted_at")}</div>
                            <div><strong>Iniciado:</strong> {getTimelineValue(selectedHistoryItem, "started_at")}</div>
                            <div><strong>Terminado:</strong> {getTimelineValue(selectedHistoryItem, "finished_at")}</div>
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
