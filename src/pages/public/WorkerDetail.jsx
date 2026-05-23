import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, itemFromResponse, listFromResponse } from "../../api/normalize";

export default function WorkerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [types, setTypes] = useState([]);
  const [serviceTypeName, setServiceTypeName] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem("token");
  const [userRole, setUserRole] = useState("");
  const [userWorkerId, setUserWorkerId] = useState("");

  const getStoredProfile = () => {
    try {
      return JSON.parse(localStorage.getItem("user_profile_me") || "{}");
    } catch (_) {
      return {};
    }
  };

  const getDefaultAddressId = () => {
    const storedProfile = getStoredProfile();
    const localDefault = localStorage.getItem("user_default_address_id");
    return storedProfile?.address_id || storedProfile?.address?.address_id || localDefault || "";
  };

  const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

  const selectedServiceType = types.find((type) => normalizeText(type.service_name) === normalizeText(serviceTypeName)) || null;

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
    
    const matchedType = selectedServiceType;
    if (!serviceTypeName.trim()) {
      setError("Escribe el tipo de servicio.");
      return;
    }

    if (!matchedType) {
      setError("El tipo de servicio no coincide con uno disponible. Escribe uno válido como Electricista o Pintor.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const localProfile = getStoredProfile();
      const addressId = getDefaultAddressId();
      const description = `Solicitud para ${worker?.name ?? ""} ${worker?.lastname ?? ""}. ${notes}`.trim();
      const parsedServiceTypeId = Number(matchedType.service_type_id);
    const parsedEstimatedPrice = estimatedPrice !== "" ? Number(estimatedPrice) : Number(estimado);
    if (Number.isNaN(parsedEstimatedPrice) || parsedEstimatedPrice < 0) {
      setError("El precio estimado debe ser un número positivo.");
      return;
    }
    
    await api.post("/services/request", {
        service_type_id: parsedServiceTypeId,
      worker_id: Number(id),
      description,
      ...(addressId ? { address_id: Number(addressId) } : {}),
      estimated_price: parsedEstimatedPrice,
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

  const estimado = worker && serviceTypeName.trim()
    ? selectedServiceType?.hourly_rate ?? worker.hourly_rate ?? 350
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
                  <input
                    className="form-control form-control-lg"
                    list="serviceTypeOptions"
                    value={serviceTypeName}
                    onChange={(e) => {
                      setServiceTypeName(e.target.value);
                      setError("");
                    }}
                    placeholder="Escribe el tipo de servicio, por ejemplo: Electricista, Pintor"
                    disabled={!token || userRole === "worker"}
                  />
                  <datalist id="serviceTypeOptions">
                    {types.map((type) => (
                      <option key={type.service_type_id} value={type.service_name}>
                        {type.description || ""}
                      </option>
                    ))}
                  </datalist>
                  <div className="form-text">Escribe el oficio tal como lo ves en la lista: Electricista, Pintor, Plomero, etc.</div>
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

                <div>
                  <label className="form-label fw-semibold">Precio estimado</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Dejar vacío para usar la cotización estimada"
                    value={estimatedPrice}
                    onChange={e => setEstimatedPrice(e.target.value)}
                    disabled={!token || userRole === "worker"}
                  />
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