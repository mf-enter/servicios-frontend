// src/components/layout/AdminHeader.jsx
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function AdminHeader(){
  const { user, logout } = useAuth();
  return (
    <header className="d-flex align-items-center justify-content-between py-3 px-4 border-bottom bg-white">
      <div className="d-flex gap-2 align-items-center">
        <span className="text-muted">Panel administrativo</span>
        <Link to="/" className="btn btn-sm btn-outline-primary">Salir del panel</Link>
      </div>
      <div className="d-flex align-items-center gap-3">
        <div className="text-end">
          <div className="fw-semibold">Admin</div>
          <small className="text-muted">{user?.email ?? "admin@serviciospro.com"}</small>
        </div>
        <button className="btn btn-sm btn-outline-danger" onClick={logout}>Cerrar sesión</button>
      </div>
    </header>
  );
}