import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, itemFromResponse, listFromResponse } from "../../api/normalize";

export default function WorkerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [types, setTypes] = useState([]);
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem("token");
  const [userRole, setUserRole] = useState("");
  const [userWorkerId, setUserWorkerId] = useState("");

  useEffect(() => {
    let mounted = true;

    // Extraer info del usuario desde el token
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        setUserRole(payload?.role || "");
        setUserWorkerId(payload?.worker_id || "");
      } catch (e) {
        console.error("Error decodificando token:", e);
      }
    }

    Promise.all([
      api.get(`/workers/${id}`)
        .then((response) => {
          if (!mounted) return;
          let fetched = itemFromResponse(response) || {};
          try {
            const local = localStorage.getItem(`worker_profile_${id}`);
            if (local) {
              const parsed = JSON.parse(local);
              fetched = { ...fetched, ...parsed };
            }
          } catch (_) {}
          setWorker(fetched);
        })
        .catch((err) => { if (mounted) setError(apiErrorMessage(err)); }),
      api.get("/service-types")
        .then(r => { if (mounted) setTypes(listFromResponse(r)); })
        .catch(()=>{})
    ]).finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [id]);

  const contratar = async (e) => {
    e.preventDefault();
    
    if (!token) {
      navigate("/login");
      return;
    }
    
    if (!serviceTypeId) {
      setError("Selecciona un tipo de servicio.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      let clientPayload = {};
      try {
        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        let localProfile = {};
        try {
          localProfile = JSON.parse(localStorage.getItem("user_profile_me") || "{}");
        } catch (_) {
          localProfile = {};
        }
        clientPayload = {
          client_id: payload?.user_id || payload?.id || null,
          client_name: localProfile?.name || payload?.name || payload?.fullname || payload?.username || null,
          client_lastname: localProfile?.lastname || payload?.lastname || null,
          client_phone: localProfile?.phone_number || payload?.phone_number || payload?.phone || null,
          client_email: localProfile?.email || payload?.email || null,
          client_address: localProfile?.address || null,
          client_city: localProfile?.city || null,
          client_state: localProfile?.state || null,
          // Compatibilidad con diferentes esquemas de backend
          address_phone_number: localProfile?.phone_number || payload?.phone_number || payload?.phone || null,
          address: localProfile?.address || null,
          full_address: [localProfile?.address, localProfile?.city, localProfile?.state].filter(Boolean).join(", ") || null,
        };
      } catch (_) {
        clientPayload = {};
      }

      const contactLine = [clientPayload?.client_phone, clientPayload?.client_email].filter(Boolean).join(" | ");
      const addressLine = [clientPayload?.client_address, clientPayload?.client_city, clientPayload?.client_state]
        .filter(Boolean)
        .join(", ");
      const descriptionWithContact = [
        `Solicitud para ${worker?.name ?? ""} ${worker?.lastname ?? ""}. ${notes}`.trim(),
        contactLine ? `Contacto cliente: ${contactLine}` : "",
        addressLine ? `Domicilio cliente: ${addressLine}` : "",
      ]
        .filter(Boolean)
        .join(". ");
      
      await api.post("/services/request", {
        service_type_id: Number(serviceTypeId),
        worker_id: Number(id),
        description: descriptionWithContact,
        ...clientPayload,
      });
      
      navigate("/mi-cuenta", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="alert alert-info">Cargando perfil...</div>;
  }

  if (error && !worker) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const estimado = worker && serviceTypeId 
    ? types.find(t => t.service_type_id === Number(serviceTypeId))?.hourly_rate ?? worker.hourly_rate ?? 350
    : worker?.hourly_rate ?? 350;

  return (
    <div>
      <div className="mb-3">
        <Link to="/trabajadores" className="btn btn-outline-secondary btn-sm">← Ver otros trabajadores</Link>
      </div>

      {error && token && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        {/* Perfil del trabajador */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 sticky-lg-top" style={{top: "20px"}}>
            <div className="card-body text-center">
              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{width:80,height:80,fontSize:32}}>
                {(worker?.name?.[0] || "W") + (worker?.lastname?.[0] || "")}
              </div>
              
              <h2 className="fw-bold">{worker?.name} {worker?.lastname}</h2>
              
              {worker?.specialty && (
                <p className="text-primary fw-semibold mb-2">⚡ {worker.specialty}</p>
              )}

              {worker?.is_verified && <div className="badge bg-success mb-3">✅ Verificado</div>}

              <hr className="my-3" />

              {/* Descripción completa */}
              <div className="mb-3">
                <h6 className="text-uppercase text-muted small mb-2">📋 Sobre este profesional</h6>
                <p className="text-muted lh-sm small">
                  {worker?.bio || "Profesional verificado disponible para servicios a domicilio."}
                </p>
              </div>

              {/* Contacto */}
              <div className="mb-3">
                <h6 className="text-uppercase text-muted small mb-2">📞 Contacto</h6>
                {worker?.email && (
                  <p className="mb-2 small">
                    <strong>📧 Email:</strong><br/>
                    <a href={`mailto:${worker.email}`} className="text-primary text-decoration-none">
                      {worker.email}
                    </a>
                  </p>
                )}
                {worker?.phone_number && (
                  <p className="mb-0 small">
                    <strong>☎️ Teléfono:</strong><br/>
                    <a href={`tel:${worker.phone_number}`} className="text-primary text-decoration-none">
                      {worker.phone_number}
                    </a>
                  </p>
                )}
              </div>

              <hr className="my-3" />

              {/* Estadísticas */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="p-3 bg-light rounded text-center">
                    <div className="fw-bold h5 mb-1">${worker?.hourly_rate ?? "N/A"}</div>
                    <small className="text-muted">Cotización base</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 bg-light rounded text-center">
                    <div className="fw-bold h5 mb-1">{worker?.experience_years ?? "5"}+</div>
                    <small className="text-muted">años de exp.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de contratación */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h3 className="mb-4">Contratar este servicio</h3>

              {!token && (
                <div className="alert alert-warning mb-3">
                  Debes iniciar sesión para contratar. <Link to="/login">Ir al login</Link>
                </div>
              )}

              {token && userRole === "worker" && (
                <div className="alert alert-danger mb-3">
                  <strong>Los trabajadores no pueden contratar servicios.</strong><br/>
                  Solo usuarios pueden contratar trabajadores. Si eres un usuario, inicia sesión con otra cuenta.
                </div>
              )}

              <form onSubmit={contratar} className="d-grid gap-3">
                <div>
                  <label className="form-label fw-semibold">Tipo de servicio *</label>
                  <select 
                    className="form-select form-select-lg" 
                    value={serviceTypeId} 
                    onChange={e => {
                      setServiceTypeId(e.target.value);
                      setError("");
                    }}
                    disabled={!token || userRole === "worker"}
                  >
                    <option value="">Selecciona tipo de servicio</option>
                    {types.map(t=>(
                      <option key={t.service_type_id} value={t.service_type_id}>
                        {t.service_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label fw-semibold">Descripción o notas (opcional)</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Cuéntale al trabajador qué necesitas..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                    rows="4"
                    disabled={!token || userRole === "worker"}
                  />
                </div>

                <div className="p-3 bg-light rounded">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Cotizacion estimada:</span>
                    <strong className="text-primary" style={{fontSize: "1.25rem"}}>
                      ${estimado}
                    </strong>
                  </div>
                  <small className="text-muted">El precio final depende del tipo de servicio y la solicitud del cliente</small>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg"
                  disabled={!token || userRole === "worker" || submitting}
                >
                  {submitting ? "Contratando..." : "Contratar ahora"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}