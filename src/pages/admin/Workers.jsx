import { useEffect, useState } from "react";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    email: "",
    password: "",
    bio: "",
    hourly_rate: "",
    experience_years: "",
    is_verified: false,
    phone_number: "",
    username: "",
    birthdate: "",
  });

  const loadWorkers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/workers");
      setWorkers(listFromResponse(res));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim() || !formData.lastname.trim() || !formData.email.trim()) {
      setError("Nombre, apellido y email son obligatorios.");
      return;
    }

    try {
      if (editingId) {
        // Actualizar
        await api.put(`/workers/${editingId}`, formData);
        setSuccess("Trabajador actualizado exitosamente.");
      } else {
        // Crear
        if (!formData.password || formData.password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres.");
          return;
        }
        await api.post("/workers", formData);
        setSuccess("Trabajador creado exitosamente.");
      }
      
      resetForm();
      loadWorkers();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      lastname: "",
      email: "",
      password: "",
      bio: "",
      hourly_rate: "",
      experience_years: "",
      is_verified: false,
      phone_number: "",
      username: "",
      birthdate: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (worker) => {
    setFormData({
      name: worker.name,
      lastname: worker.lastname,
      email: worker.email,
      password: "",
      bio: worker.bio || "",
      hourly_rate: worker.hourly_rate || "",
      experience_years: worker.experience_years || "",
      is_verified: worker.is_verified || false,
      phone_number: worker.phone_number || "",
      username: worker.username || "",
      birthdate: worker.birthdate || "",
    });
    setEditingId(worker.worker_id || worker.user_id);
    setShowForm(true);
  };

  const handleVerify = async (workerId) => {
    try {
      setError("");
      setSuccess("");
      await api.patch(`/workers/${workerId}/verify`, {
        is_verified: true
      });
      setSuccess("Trabajador verificado exitosamente.");
      loadWorkers();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleDelete = async (workerId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este trabajador?")) return;
    
    try {
      setError("");
      setSuccess("");
      await api.delete(`/workers/${workerId}`);
      setSuccess("Trabajador eliminado exitosamente.");
      loadWorkers();
      try { localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "worker-delete", id: workerId })); } catch (_) {}
      try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="section-title mb-0">CRUD Trabajadores</h2>
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
        >
          {showForm ? "Cancelar" : "Crear trabajador"}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Formulario */}
      {showForm && (
        <div className="card shadow-sm mb-4 border-0">
          <div className="card-body">
            <h4 className="mb-3">{editingId ? "Editar Trabajador" : "Crear Trabajador"}</h4>
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-6">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Nombre"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Apellido"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <input 
                  type="text"
                  className="form-control"
                  placeholder="Nombre de usuario (opcional)"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-6">
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="Teléfono"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-6">
                <input 
                  type="date" 
                  className="form-control" 
                  placeholder="Fecha de nacimiento"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                />
              </div>
              {!editingId && (
                <div className="col-md-6">
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Contraseña"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingId}
                  />
                </div>
              )}
              <div className="col-md-6">
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Referencia de cotizacion"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-md-6">
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Años de experiencia"
                  name="experience_years"
                  value={formData.experience_years}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="col-12">
                <textarea 
                  className="form-control" 
                  placeholder="Bio / Especialidad"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input 
                    type="checkbox" 
                    className="form-check-input" 
                    id="verified"
                    name="is_verified"
                    checked={formData.is_verified}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label" htmlFor="verified">
                    Verificado
                  </label>
                </div>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-success">
                  {editingId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de trabajadores */}
      {loading && <div className="alert alert-info">Cargando...</div>}
      {!loading && workers.length === 0 && <div className="alert alert-warning">No hay trabajadores.</div>}

      {!loading && workers.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-dark">
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Especialidad</th>
                <th>Cotizacion base</th>
                <th>Experiencia</th>
                <th>Verificado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.worker_id || w.user_id}>
                  <td className="fw-semibold">{w.name} {w.lastname}</td>
                  <td>{w.email}</td>
                  <td>{w.bio || "-"}</td>
                  <td>${w.hourly_rate || "0"}</td>
                  <td>{w.experience_years || "0"} años</td>
                  <td>
                    {w.is_verified ? (
                      <span className="badge bg-success">Verificado</span>
                    ) : (
                      <span className="badge bg-warning text-dark">Pendiente</span>
                    )}
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button 
                        className="btn btn-outline-primary"
                        onClick={() => handleEdit(w)}
                        title="Editar"
                      >
                        Editar
                      </button>
                      {!w.is_verified && (
                        <button 
                          className="btn btn-outline-success"
                          onClick={() => handleVerify(w.worker_id || w.user_id)}
                          title="Verificar"
                        >
                          Verificar
                        </button>
                      )}
                      <button 
                        className="btn btn-outline-danger"
                        onClick={() => handleDelete(w.worker_id || w.user_id)}
                        title="Eliminar"
                      >
                        Eliminar
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
  );
}