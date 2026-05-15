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
        .then((response) => { if (mounted) setWorker(itemFromResponse(response)); })
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
        clientPayload = {
          client_id: payload?.user_id || payload?.id || null,
          client_name: payload?.name || payload?.fullname || payload?.username || null,
          client_phone: payload?.phone_number || payload?.phone || null,
          client_email: payload?.email || null,
        };
      } catch (_) {
        clientPayload = {};
      }
      
      await api.post("/services/request", {
        service_type_id: Number(serviceTypeId),
        worker_id: Number(id),
        description: `Solicitud para ${worker?.name ?? ""} ${worker?.lastname ?? ""}. ${notes}`,
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
              <p className="text-muted mb-3">{worker?.bio ?? "Profesional verificado disponible."}</p>

              {worker?.is_verified && <div className="badge bg-success mb-3">✅ Verificado</div>}

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="p-2 bg-light rounded">
                    <div className="fw-bold">${worker?.hourly_rate ?? 350}</div>
                    <small className="text-muted">por hora</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-light rounded">
                    <div className="fw-bold">{worker?.experience_years ?? 5}</div>
                    <small className="text-muted">años exp.</small>
                  </div>
                </div>
              </div>

              <div className="text-start">
                <strong>Email:</strong>
                <p className="text-muted">{worker?.email}</p>
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
                  <strong>⚠️ Los trabajadores no pueden contratar servicios.</strong><br/>
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
                    <span>Presupuesto estimado:</span>
                    <strong className="text-primary" style={{fontSize: "1.25rem"}}>
                      ${estimado}/hr
                    </strong>
                  </div>
                  <small className="text-muted">El precio final dependerá de la duración del trabajo</small>
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