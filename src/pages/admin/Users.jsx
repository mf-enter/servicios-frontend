import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { apiErrorMessage, listFromResponse } from "../../api/normalize";

const EMPTY_FORM = {
  name: "",
  lastname: "",
  email: "",
  password: "",
  role: "user",
  phone_number: "",
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const getUsersFromApi = async () => {
    const endpoints = ["/users", "/admin/users"];
    for (const endpoint of endpoints) {
      try {
        const res = await api.get(endpoint);
        return listFromResponse(res);
      } catch (_) {
        // try next endpoint
      }
    }
    throw new Error("No se pudo cargar la lista de usuarios");
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getUsersFromApi();
      setUsers(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const isRegisteredClient = (u) => {
    const role = String(u?.role ?? "").toLowerCase();
    const looksWorker =
      u?.worker_id != null ||
      u?.is_verified != null ||
      u?.hourly_rate != null ||
      u?.experience_years != null ||
      u?.bio != null;

    if (role === "admin" || role === "worker") return false;
    if (looksWorker) return false;

    // Si el backend no envía role, tratamos como usuario cliente por defecto.
    return role === "user" || role === "cliente" || role === "";
  };

  const onlyRegisteredUsers = useMemo(() => {
    return users.filter(isRegisteredClient);
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return onlyRegisteredUsers;
    return onlyRegisteredUsers.filter((u) => {
      const full = `${u.name ?? ""} ${u.lastname ?? ""} ${u.email ?? ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [onlyRegisteredUsers, search]);

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
  };

  const startEdit = (user) => {
    setEditingId(user.user_id ?? user.id);
    setForm({
      name: user.name ?? "",
      lastname: user.lastname ?? "",
      email: user.email ?? "",
      password: "",
      role: "user",
      phone_number: user.phone_number || "",
    });
    setError("");
    setSuccess("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.lastname.trim() || !form.email.trim()) {
      setError("Nombre, apellido y email son obligatorios.");
      return;
    }

    if (!editingId && (!form.password || form.password.length < 6)) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const payload = {
          name: form.name.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim(),
          role: "user",
          phone_number: form.phone_number?.trim() || null,
        };

        if (form.password) payload.password = form.password;

        try {
          await api.put(`/users/${editingId}`, payload);
        } catch (_) {
          await api.put(`/admin/users/${editingId}`, payload);
        }

        setSuccess("Usuario actualizado correctamente.");
      } else {
        const payload = {
          name: form.name.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim(),
          password: form.password,
          role: "user",
          phone_number: form.phone_number?.trim() || null,
        };

        try {
          await api.post("/users", payload);
        } catch (_) {
          await api.post("/auth/register", payload);
        }

        setSuccess("Usuario creado correctamente.");
      }

      await loadUsers();
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;

    try {
      setError("");
      setSuccess("");

      try {
        await api.delete(`/users/${id}`);
      } catch (_) {
        await api.delete(`/admin/users/${id}`);
      }

      setSuccess("Usuario eliminado correctamente.");
      await loadUsers();
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      try { localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type: "user-delete", id })); } catch (_) {}
      try { window.dispatchEvent(new Event("app-data-updated")); } catch (_) {}
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="section-title mb-1">CRUD Usuarios Registrados</h2>
          <p className="text-muted mb-0">Gestión de cuentas tipo cliente (rol user).</p>
        </div>
        <button className="btn btn-outline-primary" onClick={startCreate}>
          Nuevo usuario
        </button>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="mb-3">{editingId ? "Editar usuario" : "Crear usuario"}</h5>

              {error ? <div className="alert alert-danger">{error}</div> : null}
              {success ? <div className="alert alert-success">{success}</div> : null}

              <form onSubmit={submit} className="d-grid gap-2">
                <input
                  className="form-control"
                  placeholder="Nombre"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="form-control"
                  placeholder="Apellido"
                  value={form.lastname}
                  onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                />
                <input
                  className="form-control"
                  placeholder="Teléfono"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                />
                <input
                  className="form-control"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="form-control"
                  type="password"
                  placeholder={editingId ? "Nueva contraseña (opcional)" : "Contraseña"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />

                <div className="d-flex gap-2 mt-2">
                  <button className="btn btn-primary" disabled={saving}>
                    {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
                  </button>
                  {editingId ? (
                    <button type="button" className="btn btn-outline-secondary" onClick={startCreate}>
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h5 className="mb-0">Usuarios ({filteredUsers.length})</h5>
                <input
                  className="form-control"
                  style={{ maxWidth: 280 }}
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? <div className="alert alert-info">Cargando usuarios...</div> : null}

              {!loading && filteredUsers.length === 0 ? (
                <div className="alert alert-warning mb-0">No hay usuarios registrados para mostrar.</div>
              ) : null}

              {!loading && filteredUsers.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const id = u.user_id ?? u.id;
                        return (
                          <tr key={id}>
                            <td>{id}</td>
                            <td>{u.name} {u.lastname}</td>
                            <td>{u.email}</td>
                            <td><span className="badge bg-primary">user</span></td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-outline-primary" onClick={() => startEdit(u)}>
                                  Editar
                                </button>
                                <button className="btn btn-outline-danger" onClick={() => removeUser(id)}>
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
