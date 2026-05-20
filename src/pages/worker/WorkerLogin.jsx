import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { apiErrorMessage } from "../../api/normalize";

export default function WorkerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email y contraseña son obligatorios.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/login", { email, password });
      const token = response.data?.token || response.data?.data?.token;
      const user = response.data?.user || response.data?.data?.user;
      const payload = token ? JSON.parse(atob(token.split(".")[1] || "")) : null;
      const role = user?.role || payload?.role;

      if (token) {
        localStorage.setItem("token", token);
      }

      if (role !== "worker") {
        localStorage.removeItem("token");
        setError("Esta cuenta no es de trabajador. Usa el login normal si eres cliente o administrador.");
        return;
      }

      navigate("/worker-panel", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <div className="card shadow-lg border-0">
          <div className="card-body p-5">
            <div className="text-center mb-4">
              <h2 className="fw-bold">Panel de trabajador</h2>
              <p className="text-muted">Inicia sesión para ver tus trabajos</p>
            </div>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} className="d-grid gap-3">
              <input 
                type="email" 
                className="form-control form-control-lg" 
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input 
                type="password" 
                className="form-control form-control-lg" 
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button 
                type="submit" 
                className="btn btn-primary btn-lg fw-bold"
                disabled={loading}
              >
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
            </form>

            <hr className="my-4" />

            <div className="text-center">
              <p className="text-muted mb-3">¿No tienes cuenta?</p>
              <Link to="/worker-register" className="btn btn-outline-primary w-100">
                Registrate como trabajador
              </Link>
            </div>

            <div className="text-center mt-3">
              <Link to="/" className="text-muted small">
                ← Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
