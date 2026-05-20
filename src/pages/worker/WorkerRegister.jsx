import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage } from "../../api/normalize";
import PublicLayout from "../../components/layout/PublicLayout";

export default function WorkerRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    phone_number: "",
    birthdate: "",
    bio: "",
    hourly_rate: "",
    experience_years: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validaciones
    if (!formData.name.trim() || !formData.lastname.trim()) {
      setError("Nombre y apellido son obligatorios.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Email válido es obligatorio.");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!formData.hourly_rate || Number(formData.hourly_rate) <= 0) {
      setError("La referencia de cotizacion debe ser mayor a 0.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/register", {
        name: formData.name,
        lastname: formData.lastname,
        username: formData.username || null,
        email: formData.email,
        password: formData.password,
        role: "worker",
        phone_number: formData.phone_number || null,
        birthdate: formData.birthdate || null,
        register_date: new Date().toISOString(),
        is_active: true,
        bio: formData.bio || "Profesional certificado",
        hourly_rate: Number(formData.hourly_rate),
        experience_years: Number(formData.experience_years) || 0,
      });
      
      setSuccess("¡Registro exitoso! Ahora inicia sesión.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-lg border-0">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Regístrate como trabajador</h2>
                <p className="text-muted">Completa tu información para recibir solicitudes</p>
              </div>

              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              {success && <div className="alert alert-success" role="alert">{success}</div>}

              <form onSubmit={handleSubmit} className="d-grid gap-3">
                <div className="row">
                  <div className="col-6">
                    <input 
                      type="text" 
                      className="form-control form-control-lg" 
                      placeholder="Nombre"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <input 
                      type="text" 
                      className="form-control form-control-lg" 
                      placeholder="Apellido"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <input 
                  type="text" 
                  className="form-control form-control-lg" 
                  placeholder="Nombre de usuario (opcional)"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                />

                <input 
                  type="email" 
                  className="form-control form-control-lg" 
                  placeholder="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                <input 
                  type="tel" 
                  className="form-control form-control-lg" 
                  placeholder="Teléfono"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />

                <input 
                  type="date" 
                  className="form-control form-control-lg" 
                  placeholder="Fecha de nacimiento"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                />

                <input 
                  type="password" 
                  className="form-control form-control-lg" 
                  placeholder="Contraseña"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <textarea 
                  className="form-control form-control-lg" 
                  placeholder="Bio / Especialidad (ej: Electricista con 10 años de experiencia)"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="3"
                />

                <div className="row">
                  <div className="col-6">
                    <input 
                      type="number" 
                      className="form-control form-control-lg" 
                      placeholder="Referencia de cotizacion ($)"
                      name="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={handleChange}
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-6">
                    <input 
                      type="number" 
                      className="form-control form-control-lg" 
                      placeholder="Años de experiencia"
                      name="experience_years"
                      value={formData.experience_years}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg fw-bold"
                  disabled={loading}
                >
                  {loading ? "Registrando..." : "Registrarse"}
                </button>
              </form>

              <hr className="my-4" />

              <div className="text-center">
                <p className="text-muted">¿Ya tienes cuenta?</p>
                <Link to="/login" className="btn btn-outline-primary">
                  Inicia sesión aquí
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
