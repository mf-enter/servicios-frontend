import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";

export default function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [desc, setDesc] = useState("");
  const [typeId, setTypeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    api.get("/services")
      .then((r) => {
        if (mounted) setServices(listFromResponse(r));
      })
      .catch((err) => {
        if (mounted) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const requestService = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const parsedTypeId = Number(typeId);
    if (!Number.isInteger(parsedTypeId) || parsedTypeId <= 0) {
      setError("El Service Type ID debe ser un numero entero mayor a 0.");
      return;
    }

    if (!desc.trim()) {
      setError("La descripcion es obligatoria.");
      return;
    }

    try {
      setSubmitting(true);
      // Try new standard endpoint first, fallback to legacy if needed
      // attach basic user info from token when available so backend and worker can see contact
      const token = localStorage.getItem("token");
      let extra = {};
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1] || ""));
          extra = {
            client_name: payload?.name || payload?.fullname || payload?.username || null,
            client_phone: payload?.phone_number || payload?.phone || null,
            client_id: payload?.user_id || payload?.userId || null,
            client_email: payload?.email || null,
          };
        } catch (_) {
          extra = {};
        }
      }

      try {
        await api.post("/services", {
          service_type_id: parsedTypeId,
          description: desc.trim(),
          ...extra,
        });
      } catch (firstErr) {
        await api.post("/services/request", {
          service_type_id: parsedTypeId,
          description: desc.trim(),
          ...extra,
        });
      }

      setSuccess("Servicio solicitado correctamente.");
      setDesc("");
      setTypeId("");

      // If user is logged, redirect to their account so they see their solicitudes/historial
      const token = localStorage.getItem("token");
      if (token) navigate("/mi-cuenta");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h2>Servicios</h2>
      <form onSubmit={requestService}>
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}
        <input className="form-control mb-2" placeholder="Service Type ID" value={typeId} onChange={e=>setTypeId(e.target.value)} />
        <input className="form-control mb-2" placeholder="Descripción" value={desc} onChange={e=>setDesc(e.target.value)} />
        <button className="btn btn-primary" disabled={submitting}>{submitting ? "Enviando..." : "Solicitar"}</button>
      </form>
      {loading ? <p className="mt-3">Cargando servicios...</p> : null}
      {!loading ? <ul>{services.map(s => <li key={s.service_id ?? s.id}>{s.description ?? s.service_name ?? "Servicio"}</li>)}</ul> : null}
    </div>
  );
}