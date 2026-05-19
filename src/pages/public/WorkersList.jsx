import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";
import WorkerFilters from "../../components/workers/WorkerFilters";

export default function WorkersList() {
  const [workers, setWorkers] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    Promise.all([
      api.get("/workers")
        .then(r => {
          const list = listFromResponse(r) || [];
          // Aplicar overrides locales guardados tras edición en WorkerPanel
          const merged = list.map(w => {
            try {
              const local = localStorage.getItem(`worker_profile_${w.worker_id ?? w.user_id}`);
              if (local) {
                return { ...w, ...JSON.parse(local) };
              }
            } catch (_) {}
            return w;
          });
          setWorkers(merged);
        })
        .catch(err => setError(apiErrorMessage(err))),
      api.get("/service-types")
        .then(r => {
          setProfessions(listFromResponse(r));
          // Si viene un parámetro de servicio en la URL, establece el filtro automáticamente
          const serviceParam = searchParams.get('servicio');
          if (serviceParam) {
            const matchedService = listFromResponse(r).find(
              prof => prof.service_name && prof.service_name.toLowerCase() === serviceParam.toLowerCase()
            );
            if (matchedService) {
              setSelectedProfession(matchedService.service_type_id);
              setSearch(matchedService.service_name);
            }
          }
        })
        .catch(err => console.error(err))
    ]).finally(() => setLoading(false));
  }, [searchParams]);

  const filtered = workers.filter(w => {
    // Crear mapeo de profesiones para búsqueda por nombre
    const professionForWorker = professions.find(p => p.service_type_id === w.service_type_id);
    const professionName = professionForWorker?.service_name ?? "";
    
    // Buscar en nombre, apellido, bio Y profesión
    const full = `${w.name ?? ""} ${w.lastname ?? ""} ${w.bio ?? ""} ${professionName}`.toLowerCase();
    const matchesSearch = full.includes(search.toLowerCase());
    
    // Si no hay profesión seleccionada, filtra solo por búsqueda
    if (!selectedProfession) return matchesSearch;
    
    // Si hay profesión seleccionada, filtra por búsqueda Y por servicio_type_id
    const matchesProfession = w.service_type_id == selectedProfession;
    return matchesSearch && matchesProfession;
  });

  return (
    <div>
      <h2 className="section-title">Trabajadores certificados</h2>
      <p className="text-muted">Encuentra al profesional ideal por nombre, oficio o especialidad.</p>

      <WorkerFilters 
        search={search} 
        setSearch={setSearch}
        professions={professions}
        selectedProfession={selectedProfession}
        setSelectedProfession={setSelectedProfession}
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Cargando trabajadores...</div>}

      <div className="row g-3">
        {filtered.map(w=>(
          <div key={w.worker_id ?? w.user_id} className="col-12 col-md-6 col-lg-4">
            <div 
              className="card h-100 shadow-sm border-0"
              style={{
                transition: "all 0.3s ease",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div className="card-body d-flex flex-column">
                {/* Avatar */}
                <div className="mb-3">
                  <div 
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                    style={{width: 56, height: 56, fontSize: "1.5rem", fontWeight: "bold"}}
                  >
                    {(w.name?.[0] || "W") + (w.lastname?.[0] || "")}
                  </div>
                </div>

                {/* Nombre y especialidad */}
                <h5 className="fw-bold mb-1">{w.name} {w.lastname}</h5>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{fontSize: "1.2rem"}}>⚡</span>
                  <span className="text-primary fw-semibold">{w.bio ?? "Profesional verificado"}</span>
                </div>

                {/* Verificación */}
                {w.is_verified && (
                  <div className="mb-3">
                    <span className="badge bg-success">✅ Verificado</span>
                  </div>
                )}

                {/* Llamado a la acción: no mostrar precio */}
                <div className="mb-3 p-3 bg-light rounded-3 text-center">
                  <small className="text-muted d-block mb-1">Contrata, agenda y te damos tu cotización</small>
                  <div className="h6 mb-0 text-primary fw-semibold">
                    Contrata, agenda y te damos tu cotización
                  </div>
                </div>

                {/* Botón */}
                <Link 
                  className="btn btn-primary fw-semibold mt-auto"
                  to={`/trabajadores/${w.worker_id ?? w.user_id}`}
                  style={{transition: "all 0.2s"}}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  Ver perfil y solicitar cotización →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && <div className="alert alert-warning mt-3">No hay trabajadores que coincidan con tu búsqueda.</div>}
    </div>
  );
}