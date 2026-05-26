import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, itemFromResponse, listFromResponse } from "../../api/normalize";

export default function Account() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const hiddenHistoryStorageKey = "hidden_history_service_ids";
  const workerHiddenHistoryStorageKey = "worker_hidden_history_service_ids";
  const defaultAddressStorageKey = "user_default_address_id";

  const [user, setUser] = useState(null);
  const [requestedServices, setRequestedServices] = useState([]);
  const [historyServicesData, setHistoryServicesData] = useState([]);
  const [activeTab, setActiveTab] = useState("activos");
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    lastname: "",
    email: "",
    phone_number: "",
    address_id: "",
  });
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({
    entity_type: "user",
    address_type: "home",
    postal_code_id: "",
    street_name: "",
    ext_number: "",
    int_number: "",
    phone_number: "",
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [saveAddressAsDefault, setSaveAddressAsDefault] = useState(false);

  const getHiddenHistoryIds = () => {
    try {
      const raw = localStorage.getItem(hiddenHistoryStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set((Array.isArray(parsed) ? parsed : []).map((value) => String(value)));
    } catch (_) {
      return new Set();
    }
  };

  const hideHistoryId = (serviceId) => {
    try {
      const normalized = String(serviceId ?? "");
      if (!normalized) return;

      const current = Array.from(getHiddenHistoryIds());
      if (!current.includes(normalized)) {
        const updated = [...current, normalized];
        localStorage.setItem(hiddenHistoryStorageKey, JSON.stringify(updated));
        // También mantener sincronía visual con WorkerPanel en el mismo navegador.
        localStorage.setItem(workerHiddenHistoryStorageKey, JSON.stringify(updated));
      }
    } catch (_) {}
  };

  const filterHiddenHistory = (items) => {
    const hiddenIds = getHiddenHistoryIds();
    return (items || []).filter((item) => {
      const serviceId = item?.service_id ?? item?.id;
      return !hiddenIds.has(String(serviceId ?? ""));
    });
  };

  const extractProfileData = (response) => {
    const root = response?.data ?? {};
    return root?.data ?? root ?? {};
  };

  const getAddressLabel = (address) => {
    if (!address) return "Sin dirección disponible";
    if (typeof address === "string") return address;

    const lineOne = [address.street_name, address.ext_number, address.int_number].filter(Boolean).join(" ");
    const lineTwo = [address.settlement_name, address.city_name, address.state_name, address.country_name].filter(Boolean).join(", ");
    const parts = [lineOne, lineTwo, address.postal_code ? `CP ${address.postal_code}` : ""].filter(Boolean);

    return parts.length > 0 ? parts.join(" - ") : "Sin dirección disponible";
  };

  const getServiceTimeline = (service) => service?.timeline ?? service ?? {};

  const formatCompactAddress = (address) => {
    if (!address) return "Sin dirección disponible";
    if (typeof address === "string") return address;

    const streetLine = [address.street_name, address.ext_number, address.int_number ? `Int ${address.int_number}` : ""]
      .filter(Boolean)
      .join(" ")
      .trim();

    const cityName = address.city_name ?? "";
    const parts = [streetLine, cityName].filter(Boolean);
    return parts.length > 0 ? `${parts[0] || ""}${parts[1] ? `, ${parts[1]}` : ""}`.trim() : "Sin dirección disponible";
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

  const canAcceptQuote = (service) => {
    const latestQuote = getLatestQuote(service);
    const status = String(latestQuote?.status ?? "").toUpperCase();
    return Boolean(latestQuote?.quote_id) && status === "PENDIENTE";
  };

  const getLatestQuote = (service) => {
    return service?.latest_quote ?? service?.quote ?? null;
  };

  const getServiceQuoteAmount = (service) => {
    const candidates = [
      service?.estimated_price,
      service?.latest_quote?.amount,
      service?.latest_quote?.estimated_price,
      service?.quote?.amount,
      service?.quote?.estimated_price,
      service?.amount,
    ];

    const value = candidates.find((candidate) => {
      const numeric = Number(candidate);
      return candidate !== undefined && candidate !== null && candidate !== "" && Number.isFinite(numeric) && numeric > 0;
    });
    return Number(value ?? 0);
  };

  const buildTransactionReference = (serviceId) => {
    const base = `WEB-${serviceId ?? "service"}-${Date.now()}`;
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${base}-${crypto.randomUUID()}`;
    }

    return `${base}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const getServicePaymentMethodId = (service) => {
    const latestQuote = getLatestQuote(service);
    const candidates = [
      service?.payment_method_id,
      latestQuote?.payment_method_id,
      service?.quote?.payment_method_id,
      service?.latest_quote?.payment_method_id,
      service?.quotes?.[0]?.payment_method_id,
    ];

    const value = candidates.find((candidate) => candidate !== undefined && candidate !== null && candidate !== "");
    return value ? Number(value) : null;
  };

  const getServiceQuoteId = (service) => {
    const latestQuote = getLatestQuote(service);
    const candidates = [
      latestQuote?.quote_id,
      latestQuote?.id,
      service?.quote_id,
      service?.latest_quote_id,
      service?.active_quote_id,
      service?.quote?.quote_id,
      service?.quote?.id,
      service?.latest_quote?.quote_id,
      service?.latest_quote?.id,
      service?.quotes?.[0]?.quote_id,
      service?.quotes?.[0]?.id,
    ];

    return candidates.find((value) => value !== undefined && value !== null && value !== "") ?? null;
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

  const getServiceAddress = (service) => service?.address ?? {};

  const getAddressDetail = (address) => {
    const lineOne = [address?.street_name, address?.ext_number, address?.int_number].filter(Boolean).join(" ");
    const lineTwo = [address?.settlement_name, address?.city_name, address?.state_name, address?.country_name].filter(Boolean).join(", ");
    const parts = [lineOne, lineTwo, address?.postal_code ? `CP ${address.postal_code}` : "", address?.phone_number ? `Tel. ${address.phone_number}` : ""].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : "Sin dirección disponible";
  };

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
    const historyRaw = historyResult.status === "fulfilled" ? listFromResponse(historyResult.value) : [];
    const history = filterHiddenHistory(historyRaw);
    const [requestedWithDetails, historyWithDetails] = await Promise.all([
      mergeServiceDetails(requested),
      mergeServiceDetails(history),
    ]);

    if (requested.length === 0 && history.length === 0 && requestedResult.status === "rejected" && historyResult.status === "rejected") {
      throw requestedResult.reason || historyResult.reason;
    }

    return { requested: requestedWithDetails, history: historyWithDetails };
  };

  const fetchUserProfile = async () => {
    const response = await api.get("/users/me/profile");
    return extractProfileData(response);
  };

  const fetchAddresses = async () => {
    const response = await api.get("/addresses");
    return listFromResponse(response).filter((address) => !address?.entity_type || address.entity_type === "user");
  };

  const fetchServiceById = async (serviceId) => {
    const response = await api.get(`/services/${serviceId}`);
    return itemFromResponse(response) || response?.data?.data || response?.data || null;
  };
  
  const mergeServiceDetails = async (services) => {
    const entries = Array.isArray(services) ? services : [];

    const resolved = await Promise.allSettled(
      entries.map(async (service) => {
        const serviceId = service?.service_id ?? service?.id;
        if (!serviceId) return service;

        const details = await fetchServiceById(serviceId).catch(() => null);
        return details ? { ...service, ...details } : service;
      })
    );

    return resolved.map((result, index) => (result.status === "fulfilled" ? result.value : entries[index]));
  };

  const upsertUserService = (serviceData) => {
    if (!serviceData) return;
    const serviceId = serviceData.service_id ?? serviceData.id;
    if (!serviceId) return;

    const updateService = (service) => ((service.service_id ?? service.id) === serviceId ? { ...service, ...serviceData } : service);

    setRequestedServices((prev) => prev.map(updateService));
    setHistoryServicesData((prev) => prev.map(updateService));
    setUser((prev) => {
      if (!prev?.latest_service) return prev;
      const latestId = prev.latest_service.service_id ?? prev.latest_service.id;
      return latestId === serviceId ? { ...prev, latest_service: { ...prev.latest_service, ...serviceData } } : prev;
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

  const syncDefaultAddress = async (addressId) => {
    const normalizedId = addressId ? String(addressId) : "";
    await api.put("/users/me/profile", { address_id: normalizedId ? Number(normalizedId) : null });
    setProfileForm((prev) => ({ ...prev, address_id: normalizedId }));
    setUser((prev) => (prev ? { ...prev, address_id: normalizedId ? Number(normalizedId) : null } : prev));
    try {
      localStorage.setItem(defaultAddressStorageKey, normalizedId);
      const storedProfile = JSON.parse(localStorage.getItem("user_profile_me") || "{}");
      const updatedProfile = { ...storedProfile, address_id: normalizedId ? Number(normalizedId) : null };
      localStorage.setItem("user_profile_me", JSON.stringify(updatedProfile));
      if (user?.user_id) {
        localStorage.setItem(`client_profile_${user.user_id}`, JSON.stringify(updatedProfile));
        localStorage.setItem(`user_profile_${user.user_id}`, JSON.stringify(updatedProfile));
      }
    } catch (_) {}
  };

  const clearAddressForm = () => {
    setAddressForm({
      entity_type: "user",
      address_type: "home",
      postal_code_id: "",
      street_name: "",
      ext_number: "",
      int_number: "",
      phone_number: "",
    });
    setEditingAddressId(null);
    setSaveAddressAsDefault(false);
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

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const [servicesData, profileResult, addressesResult] = await Promise.allSettled([
          fetchServices(),
          fetchUserProfile(),
          fetchAddresses(),
        ]);

        const safeServices = servicesData.status === "fulfilled" ? servicesData.value : { requested: [], history: [] };
        const localProfile = (() => {
          try {
            return JSON.parse(localStorage.getItem("user_profile_me") || "{}");
          } catch (_) {
            return {};
          }
        })();
        const remoteProfile = profileResult.status === "fulfilled" ? profileResult.value : {};
        const mergedProfile = {
          ...localProfile,
          ...remoteProfile,
          address: remoteProfile?.address ?? localProfile?.address ?? null,
        };

        setRequestedServices(safeServices.requested || []);
        setHistoryServicesData(safeServices.history || []);
        setAddresses(addressesResult.status === "fulfilled" ? addressesResult.value : []);

        setProfileForm((prev) => ({
          ...prev,
          name: mergedProfile.name || prev.name || "",
          lastname: mergedProfile.lastname || prev.lastname || "",
          email: mergedProfile.email || prev.email || "",
          phone_number: mergedProfile.phone_number || prev.phone_number || "",
          address_id:
            mergedProfile.address_id ||
            mergedProfile.address?.address_id ||
            localStorage.getItem(defaultAddressStorageKey) ||
            prev.address_id ||
            "",
        }));

        if (mergedProfile.address) {
          setAddressForm({
            entity_type: mergedProfile.address.entity_type || "user",
            address_type: mergedProfile.address.address_type || "home",
            postal_code_id: mergedProfile.address.postal_code_id || "",
            street_name: mergedProfile.address.street_name || "",
            ext_number: mergedProfile.address.ext_number || "",
            int_number: mergedProfile.address.int_number || "",
            phone_number: mergedProfile.address.phone_number || "",
          });
          setEditingAddressId(mergedProfile.address.address_id || null);
        }

        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const userId = payload.user_id;
          const normalizedProfile = {
            user_id: userId,
            name: mergedProfile.name || payload.name || payload.fullname || "",
            lastname: mergedProfile.lastname || payload.lastname || "",
            email: mergedProfile.email || payload.email || "",
            phone_number: mergedProfile.phone_number || payload.phone_number || "",
            address_id:
              mergedProfile.address_id ||
              mergedProfile.address?.address_id ||
              localStorage.getItem(defaultAddressStorageKey) ||
              null,
            address: mergedProfile.address || null,
            latest_service: mergedProfile.latest_service || null,
          };

          setUser({
            user_id: userId,
            role: payload.role,
            ...normalizedProfile,
          });

          try {
            localStorage.setItem("user_profile_me", JSON.stringify(normalizedProfile));
            localStorage.setItem(`client_profile_${userId}`, JSON.stringify(normalizedProfile));
            localStorage.setItem(`user_profile_${userId}`, JSON.stringify(normalizedProfile));
          } catch (_) {}

          try {
              window.dispatchEvent(new CustomEvent("profile-updated", { detail: { user_id: userId } }));
              try { localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "user-profile", id: userId })); } catch (_) {}
              try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
          } catch (_) {}
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
    const intervalId = setInterval(() => {
      if (mounted) {
        refreshServices().catch(() => {});
      }
    }, 10000);

    const handleFocus = () => {
      refreshServices().catch(() => {});
    };

    const handleWorkerProfileUpdated = () => {
      refreshServices().catch(() => {});
    };

    const handleAppDataUpdated = () => {
      refreshServices().catch(() => {});
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("worker-profile-updated", handleWorkerProfileUpdated);
    window.addEventListener("app-data-updated", handleAppDataUpdated);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("worker-profile-updated", handleWorkerProfileUpdated);
      window.removeEventListener("app-data-updated", handleAppDataUpdated);
    };
  }, [token, navigate]);

  const refreshServices = async () => {
    const data = await fetchServices();
    setRequestedServices(data.requested || []);
    setHistoryServicesData(data.history || []);
  };

  const handleProfileInput = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateProfile = async (event) => {
    event.preventDefault();
    const payload = {
      address_id: profileForm.address_id ? Number(profileForm.address_id) : null,
    };

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

      const response = await api.put("/users/me/profile", payload);
      const savedProfile = extractProfileData(response);
      setUser((prev) => ({ ...prev, ...savedProfile, address_id: payload.address_id }));
      try {
        const resolvedUserId = user?.user_id;
        const normalizedProfile = {
          ...user,
          ...savedProfile,
          user_id: resolvedUserId,
          address_id: payload.address_id,
          address: savedProfile?.address || user?.address || null,
          latest_service: savedProfile?.latest_service || user?.latest_service || null,
        };
        localStorage.setItem("user_profile_me", JSON.stringify(normalizedProfile));
        if (resolvedUserId) {
          localStorage.setItem(`client_profile_${resolvedUserId}`, JSON.stringify(normalizedProfile));
          localStorage.setItem(`user_profile_${resolvedUserId}`, JSON.stringify(normalizedProfile));
        }
        localStorage.setItem(defaultAddressStorageKey, payload.address_id ? String(payload.address_id) : "");
        try {
          window.dispatchEvent(new CustomEvent("profile-updated", { detail: { user_id: resolvedUserId } }));
        } catch (_) {}
      } catch (_) {}
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
      entity_type: addressForm.entity_type || "user",
      address_type: addressForm.address_type || "home",
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

      const refreshedAddresses = await fetchAddresses();
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
      entity_type: address?.entity_type || "user",
      address_type: address?.address_type || "home",
      postal_code_id: address?.postal_code_id || "",
      street_name: address?.street_name || "",
      ext_number: address?.ext_number || "",
      int_number: address?.int_number || "",
      phone_number: address?.phone_number || "",
    });
    setEditingAddressId(address?.address_id || null);
    setSaveAddressAsDefault(true);
  };

  const deleteHistoryItem = async (service) => {
    const serviceId = service?.service_id ?? service?.id;
    if (!serviceId) {
      setError("No se pudo identificar el historial a eliminar.");
      return;
    }
    if (!window.confirm(`¿Eliminar el historial del servicio #${serviceId}?`)) return;

    setActionLoadingId(serviceId);
    setError("");
    setSuccess("");

    try {
      // Si el backend ya implementó DELETE real, esto sincroniza con worker/admin.
      await api.delete(`/users/me/history/${serviceId}`);
      hideHistoryId(serviceId);
      setHistoryServicesData((prev) => prev.filter((item) => (item.service_id ?? item.id) !== serviceId));
        try {
          localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "history-delete", id: serviceId }));
        } catch (_) {}
        try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
        setSuccess("Historial eliminado correctamente.");
    } catch (err) {
      // Fallback visual mientras el backend no tenga endpoint.
      if (err.response?.status === 404 || err.response?.status === 405) {
        hideHistoryId(serviceId);
        setHistoryServicesData((prev) => prev.filter((item) => (item.service_id ?? item.id) !== serviceId));
        try {
          localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "history-hide", id: serviceId }));
        } catch (_) {}
        try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
        setSuccess("Historial ocultado de tu vista.");
      } else {
        setError(apiErrorMessage(err));
      }
    } finally {
      setActionLoadingId(null);
    }
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
      const updatedService = await fetchServiceById(serviceId).catch(() => null);
      if (updatedService) upsertUserService(updatedService);
      else await refreshServices();
      broadcastDataUpdated("service-cancel", serviceId);
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

  const requestAcceptQuote = async (service) => {
    const serviceId = service.service_id ?? service.id;
    const freshService = getLatestQuote(service)?.quote_id ? service : await fetchServiceById(serviceId).catch(() => null);
    const quoteSource = freshService || service;
    const quoteId = getServiceQuoteId(quoteSource);
    const amount = getServiceQuoteAmount(quoteSource);

    if (amount <= 0) {
      setError("Aun no hay cotizacion disponible para este servicio.");
      return;
    }

    if (!quoteId) {
      setError("No se encontró la cotización pendiente para este servicio.");
      return;
    }

    if (!window.confirm(`¿Aceptar la cotizacion del servicio #${serviceId}?`)) return;

    setActionLoadingId(serviceId);
    setError("");
    setSuccess("");

    try {
      // Validar que el token corresponde al cliente (debug)
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.user_id !== user?.user_id) {
        console.warn("Token mismatch: token user_id no coincide con usuario actual");
      }

      await api.post(`/quotes/${quoteId}/accept`);
      setSuccess(`Cotizacion aceptada para el servicio #${serviceId}.`);
      const updatedService = await fetchServiceById(serviceId).catch(() => null);
      if (updatedService) upsertUserService(updatedService);
      else await refreshServices();
      broadcastDataUpdated("service-status", serviceId);
    } catch (err) {
      // Loggear el error completo para debugging
      console.log("Error al aceptar cotización:", err.response?.data);
      
      const backendMessage = err.response?.data?.message;
      
      if (err.response?.status === 409) {
        setError(backendMessage || "El servicio no puede aceptarse en este estado.");
      } else if (err.response?.status === 403) {
        setError(backendMessage || "No tienes permiso para aceptar este servicio.");
      } else if (err.response?.status === 404) {
        setError(backendMessage || "El servicio no existe.");
      } else {
        setError(apiErrorMessage(err));
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const requestPayService = async (service) => {
    const serviceId = service.service_id ?? service.id;
    let amount = getServiceQuoteAmount(service);
    const paymentMethodId = getServicePaymentMethodId(service);

    if (!window.confirm(`¿Confirmas pagar el servicio #${serviceId}?`)) return;

    setActionLoadingId(serviceId);
    setError("");
    setSuccess("");

    try {
      const status = String(service.status_name ?? service.status ?? "").toLowerCase();
      const paymentAllowed = status === "completado";
      if (!paymentAllowed) {
        setError("Solo se puede pagar cuando el servicio está completado.");
        setActionLoadingId(null);
        return;
      }

      if (amount <= 0) {
        const freshService = await fetchServiceById(serviceId).catch(() => null);
        if (freshService) {
          amount = getServiceQuoteAmount(freshService);
          upsertUserService(freshService);
        }
      }

      if (amount <= 0) {
        setError("El monto del servicio no está disponible. Por favor contacta soporte.");
        setActionLoadingId(null);
        return;
      }

      await api.post("/payments", {
        service_id: serviceId,
        amount: amount,
        payment_method_id: paymentMethodId,
        transaction_reference: buildTransactionReference(serviceId),
      });

      setSuccess(`Pago aplicado para el servicio #${serviceId}.`);
      const updatedService = await fetchServiceById(serviceId).catch(() => null);
      if (updatedService) upsertUserService(updatedService);
      else await refreshServices();
      broadcastDataUpdated("payment-created", serviceId);
    } catch (err) {
      if (err.response?.status === 409) {
        setError("El backend no permite pagar este servicio en su estado actual. Debe estar en estado Completado.");
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

  const getWorkerProfileFromLocalStorage = (...workerIds) => {
    for (const workerId of workerIds.flat()) {
      const normalizedId = workerId ? String(workerId) : "";
      if (!normalizedId) continue;

      try {
        const raw = localStorage.getItem(`worker_profile_${normalizedId}`);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }

    return null;
  };

  const normalizedServices = useMemo(() => {
    return requestedServices
      .slice()
      .sort((a, b) => new Date(b.request_date ?? b.created_at ?? 0) - new Date(a.request_date ?? a.created_at ?? 0));
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
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 80, height: 80 }} />
              <h5 className="fw-bold">Mi Cuenta</h5>
              <p className="text-muted small">Usuario {user?.role === "admin" ? "Administrador" : user?.role === "worker" ? "Trabajador" : "Cliente"}</p>

              <div className="text-muted small mb-3">
                <p className="mb-1">ID: {user?.user_id}</p>
                <p className="mb-1">Activos: {activeServices.length}</p>
                <p className="mb-0">Historial: {historyServices.length}</p>
              </div>

              <div className="alert alert-light border text-start small mb-3">
                <strong>Permisos del cliente:</strong> ver el avance, el trabajador asignado, los pagos y cancelar solicitudes activas.
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
                className={`btn ${activeTab === "perfil" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setActiveTab("perfil")}
              >
                Perfil
              </button>
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

            {activeTab === "perfil" ? (
              <>
                {user?.latest_service ? (
                  <div className="card shadow-sm border-0 mb-3">
                    <div className="card-body">
                      <h5 className="mb-3">Último servicio</h5>
                      <div className="small text-muted">
                        <div><strong>Servicio:</strong> #{user.latest_service.service_id ?? user.latest_service.id ?? "-"}</div>
                        <div><strong>Estado:</strong> {user.latest_service.status_name || user.latest_service.status || "-"}</div>
                        <div><strong>Dirección:</strong> {formatCompactAddress(user.latest_service.client_address || user.latest_service.address || null)}</div>
                        <div><strong>Solicitado:</strong> {getTimelineValue(user.latest_service, "request_date")}</div>
                        <div><strong>Aceptado:</strong> {getTimelineValue(user.latest_service, "accepted_at")}</div>
                        <div><strong>Iniciado:</strong> {getTimelineValue(user.latest_service, "started_at")}</div>
                        <div><strong>Terminado:</strong> {getTimelineValue(user.latest_service, "finished_at")}</div>
                      </div>
                    </div>
                  </div>
                ) : null}

              <div className="card shadow-sm border-0 mb-3">
                <div className="card-body">
                  <h5 className="mb-3">Editar perfil</h5>
                  <p className="text-muted small">Estos datos se usan para contacto y se comparten en nuevas solicitudes hacia trabajadores.</p>
                  <form onSubmit={updateProfile} className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Nombre</label>
                      <input className="form-control" name="name" value={profileForm.name} onChange={handleProfileInput} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Apellido</label>
                      <input className="form-control" name="lastname" value={profileForm.lastname} onChange={handleProfileInput} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Correo</label>
                      <input className="form-control" type="email" name="email" value={profileForm.email} onChange={handleProfileInput} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Número</label>
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
                      <div className="form-text">El backend usará esta relación para solicitudes y para mostrar la dirección vinculada al perfil.</div>
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                        {savingProfile ? "Guardando..." : "Guardar perfil"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              </>
            ) : null}

            {activeTab !== "perfil" && !loading && listToRender.length === 0 ? (
              <div className="alert alert-warning">
                <p className="mb-0">No hay servicios en esta sección.</p>
                <small><Link to="/trabajadores" className="alert-link">Explora trabajadores →</Link></small>
              </div>
            ) : null}

            {activeTab !== "perfil" ? <div className="row g-3">
              {listToRender.map((service, index) => {
                const serviceId = service.service_id ?? service.id;
                const isExpanded = expandedServiceId === serviceId;
                const statusLower = String(service.status_name ?? service.status ?? "").toLowerCase();
                const timeline = getServiceTimeline(service);
                const isAccepted = Boolean(timeline?.accepted_at || service.accepted_at || service.accepted_date || service.accepted_on);
                const amount = getServiceQuoteAmount(service);
                const canPay = statusLower === "completado" && amount > 0;
                const isCanceled = statusLower === "cancelado";
                const paymentDone = String(service.payment_status ?? "").toLowerCase() === "completado";
                const rowKey = `${activeTab}-${serviceId ?? "no-id"}-${service.status ?? service.status_name ?? "status"}-${getTimelineValue(service, "request_date")}-${index}`;
                const requestedAt = getTimelineValue(service, "request_date");
                const acceptedAt = getTimelineValue(service, "accepted_at");
                const startedAt = getTimelineValue(service, "started_at");
                const finishedAt = getTimelineValue(service, "finished_at");
                const serviceAddress = getServiceAddress(service);
                const latestQuote = getLatestQuote(service);
                const quoteAmount = getServiceQuoteAmount(service);

                return (
                  <div key={rowKey} className="col-12">
                    <div className="card shadow-sm border-0">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                          <div>
                              <h5 className="fw-bold mb-1">Servicio #{serviceId}</h5>
                            <p className="text-muted mb-2">{service.description || "Sin descripción"}</p>
                            <div className="small text-muted mb-2">
                              <div><strong>Pedido:</strong> {requestedAt}</div>
                              <div><strong>Aceptado:</strong> {acceptedAt}</div>
                              <div><strong>Inicio:</strong> {startedAt}</div>
                              <div><strong>Terminado:</strong> {finishedAt}</div>
                              <div><strong>Dirección:</strong> {getAddressDetail(serviceAddress)}</div>
                            </div>
                            <div className="d-flex gap-2 flex-wrap mb-2">
                              <span className={`badge ${statusBadge(service.status || service.status_name)}`}>{service.status || service.status_name || "Pendiente"}</span>
                              <span className={`badge ${paymentBadge(service.payment_status)}`}>Pago: {service.payment_status || "Pendiente"}</span>
                              <span className="badge bg-light text-dark border">
                                Tipo: {service.service_type_name || service.service_name || service.type_name || "No definido"}
                              </span>
                              <span className="badge bg-light text-dark border">
                                Cotización: {quoteAmount > 0 ? `$${quoteAmount.toLocaleString()}` : "Pendiente"}
                              </span>
                            </div>
                          </div>

                          <div className="d-flex gap-2 flex-wrap justify-content-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setExpandedServiceId(isExpanded ? null : serviceId)}
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
                                disabled={actionLoadingId === serviceId}
                                onClick={() => requestCancelService(serviceId)}
                              >
                                Cancelar
                              </button>
                            ) : null}

                            {canAcceptQuote(service) ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary fw-bold"
                                disabled={actionLoadingId === serviceId}
                                onClick={() => requestAcceptQuote(service)}
                              >
                                ✓ Aceptar cotización
                              </button>
                            ) : null}

                            {statusLower === "completado" && !paymentDone ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                disabled={actionLoadingId === serviceId}
                                onClick={() => requestPayService(service)}
                              >
                                Pagar
                              </button>
                            ) : null}

                            {activeTab === "historial" ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={actionLoadingId === serviceId}
                                onClick={() => deleteHistoryItem(service)}
                              >
                                Eliminar historial
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="mt-3 pt-3 border-top">
                            <div className="row g-2 small">
                              {(() => {
                                const workerLookupIds = [
                                  service.worker_id,
                                  service.assigned_worker_id,
                                  service.service_worker_id,
                                  service.worker?.worker_id,
                                  service.worker?.user_id,
                                  service.assigned_worker?.worker_id,
                                  service.assigned_worker?.user_id,
                                ];
                                const wp = getWorkerProfileFromLocalStorage(workerLookupIds);
                                const workerName = wp?.name || service.worker_name || service.assigned_worker_name || "-";
                                const workerLastname = wp?.lastname || service.worker_lastname || "";
                                const workerEmail = wp?.email || service.worker_email || service.assigned_worker_email || "-";
                                const workerPhone = wp?.phone_number || wp?.phone || service.worker?.phone_number || service.worker?.phone || service.worker?.mobile || service.worker_phone || service.assigned_worker_phone || service.worker_contact_phone || "-";
                                const workerSpecialty = wp?.specialty || service.worker?.specialty || service.worker?.profession || service.worker?.service_type_name || service.worker_specialty || service.assigned_worker_specialty || service.worker_profession || "-";
                                const workerExperience = wp?.experience_years ?? service.worker_experience_years ?? service.assigned_worker_experience_years ?? "-";
                                const workerBio = wp?.bio || service.worker_bio || service.assigned_worker_bio || service.worker_description || "-";
                                const workerAddress = wp?.address || wp?.work_address || service.worker_address || service.assigned_worker_address || service.worker_profile?.address || null;
                                const serviceAddress = service.address ?? null;

                                return (
                                  <>
                                    <div className="col-12"><strong>Nombre:</strong> {workerName}</div>

                                    <div className="col-12"><strong>Apellido:</strong> {workerLastname || "-"}</div>
                                    <div className="col-12"><strong>Email:</strong> {workerEmail}</div>
                                    <div className="col-12"><strong>Teléfono:</strong> {workerPhone}</div>
                                    <div className="col-12"><strong>Profesión / Especialidad:</strong> {workerSpecialty}</div>
                                    <div className="col-12"><strong>Años de experiencia:</strong> {workerExperience}</div>
                                    <div className="col-12"><strong>Descripción de servicios:</strong> {workerBio}</div>
                                    <div className="col-12"><strong>Dirección:</strong> {formatCompactAddress(workerAddress)}</div>
                                    <div className="col-12"><strong>Cotización del trabajador:</strong> {quoteAmount > 0 ? `$${quoteAmount.toLocaleString()}` : "Pendiente"}</div>
                                    {latestQuote?.status ? <div className="col-12"><strong>Estado de cotización:</strong> {latestQuote.status}</div> : null}
                                  </>
                                );
                              })()}
                              <div className="col-12"><strong>Dirección:</strong> {getAddressDetail(serviceAddress)}</div>
                              <div className="col-12"><strong>Solicitado:</strong> {requestedAt}</div>
                              <div className="col-12"><strong>Aceptado:</strong> {acceptedAt}</div>
                              <div className="col-12"><strong>Iniciado:</strong> {startedAt}</div>
                              <div className="col-12"><strong>Terminado:</strong> {finishedAt}</div>
                              {canAcceptQuote(service) ? (
                                <div className="col-12 mt-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success fw-bold"
                                    disabled={actionLoadingId === serviceId}
                                    onClick={() => requestAcceptQuote(service)}
                                  >
                                    ✓ Aceptar cotización
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div> : null}

            {activeTab === "perfil" ? (
              <div className="card shadow-sm border-0 mb-3 mt-3">
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
                        <input className="form-check-input" type="checkbox" id="saveDefaultUserAddress" checked={saveAddressAsDefault} onChange={(e) => setSaveAddressAsDefault(e.target.checked)} />
                        <label className="form-check-label" htmlFor="saveDefaultUserAddress">Guardar como dirección por defecto</label>
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
                            <td>{getAddressDetail(address)}</td>
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
          </div>
        </div>
      </div>
    </div>
  );
}
