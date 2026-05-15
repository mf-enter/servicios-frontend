import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import PublicLayout from "../../components/layout/PublicLayout";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    email: "",
    password: "",
    confirm_password: "",
    phone_number: "",
    birthdate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validaciones básicas
    if (!form.name.trim() || !form.lastname.trim()) {
      setError("Nombre y apellido son obligatorios");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Email inválido");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/register", {
        name: form.name.trim(),
        lastname: form.lastname.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_number: form.phone_number.trim() || null,
        birthdate: form.birthdate || null,
        register_date: new Date().toISOString(),
        is_active: true,
      });
      setSuccess("¡Cuenta creada! Redirigiendo a login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || "Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container py-5" style={{ maxWidth: 520 }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h2 className="h3 mb-1">Crear cuenta</h2>
            <p className="text-secondary mb-4">Regístrate y comienza a contratar servicios profesionales.</p>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={submit}>
              <input
                className="form-control mb-2"
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="form-control mb-2"
                placeholder="Apellido"
                value={form.lastname}
                onChange={(e) => setForm({ ...form, lastname: e.target.value })}
              />
              <input
                className="form-control mb-2"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="form-control mb-2"
                type="tel"
                placeholder="Teléfono"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
              <input
                className="form-control mb-2"
                type="date"
                placeholder="Fecha de nacimiento"
                value={form.birthdate}
                onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
              />
              <input
                className="form-control mb-2"
                type="password"
                placeholder="Contraseña (mín. 6 caracteres)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <input
                className="form-control mb-3"
                type="password"
                placeholder="Confirmar contraseña"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              />
              <button className="btn btn-primary w-100" disabled={loading}>
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>

            <div className="text-center mt-3">
              <span className="text-secondary">¿Ya tienes cuenta? </span>
              <Link to="/login" className="btn btn-link p-0">
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
