import { useEffect, useState } from "react";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";

export default function ServiceTypes() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ service_name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      setError("");
      const res = await api.get("/service-types");
      setTypes(listFromResponse(res));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      if (!form.service_name.trim()) {
        setError("El nombre del servicio es obligatorio");
        return;
      }

      if (editingId) {
        await api.put(`/service-types/${editingId}`, form);
        setSuccess("Tipo de servicio actualizado");
      } else {
        await api.post("/service-types", form);
        setSuccess("Tipo de servicio creado");
      }

      setForm({ service_name: "", description: "" });
      setEditingId(null);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const edit = (type) => {
    setEditingId(type.service_type_id);
    setForm({
      service_name: type.service_name,
      description: type.description || ""
    });
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar este tipo de servicio?")) return;
    try {
      await api.delete(`/service-types/${id}`);
      setSuccess("Tipo de servicio eliminado");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const cancel = () => {
    setEditingId(null);
    setForm({ service_name: "", description: "" });
  };

  return (
    <div>
      <h2 className="section-title mb-3">Tipos de Servicio</h2>

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>{editingId ? "Editar tipo de servicio" : "Crear tipo de servicio"}</h5>
              
              {error && <div className="alert alert-danger mb-2">{error}</div>}
              {success && <div className="alert alert-success mb-2">{success}</div>}

              <form onSubmit={submit} className="d-grid gap-2">
                <div>
                  <label className="form-label fw-semibold">Nombre del servicio *</label>
                  <input
                    className="form-control"
                    placeholder="Ej: Electricista"
                    value={form.service_name}
                    onChange={e => setForm({ ...form, service_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label fw-semibold">Descripción</label>
                  <textarea
                    className="form-control"
                    placeholder="Descripción del servicio"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows="3"
                  />
                </div>

                <button className="btn btn-primary" type="submit">
                  {editingId ? "Actualizar" : "Crear"}
                </button>
                
                {editingId && (
                  <button className="btn btn-outline-secondary" type="button" onClick={cancel}>
                    Cancelar
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          {loading && <div className="alert alert-info">Cargando tipos de servicio...</div>}

          <div className="table-responsive">
            <table className="table table-bordered bg-white">
              <thead className="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th className="text-center" style={{ width: 120 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {types.map(type => (
                  <tr key={type.service_type_id}>
                    <td className="fw-semibold">{type.service_name}</td>
                    <td className="text-muted">{type.description || "—"}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => edit(type)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger ms-1"
                        onClick={() => del(type.service_type_id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && types.length === 0 && (
            <div className="alert alert-warning">No hay tipos de servicio creados.</div>
          )}
        </div>
      </div>
    </div>
  );
}