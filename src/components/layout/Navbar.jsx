// src/components/layout/Navbar.jsx
import { Link, NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function Navbar(){
	const token = localStorage.getItem("token");
	const { logout } = useAuth();

	return (
		<nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm px-4 py-3">
			<div className="container-fluid">
				<Link className="navbar-brand fw-bold text-primary d-flex align-items-center gap-2" to="/">
					<span className="badge-soft rounded-3 px-2 py-1">🧰</span>
					Servicios Pro
				</Link>

				<div className="d-flex gap-3 align-items-center">
					<NavLink to="/" className="btn btn-link text-dark">Inicio</NavLink>
					<NavLink to="/trabajadores" className="btn btn-link text-dark">Trabajadores</NavLink>

					{token ? (
						<div className="dropdown">
							<button className="btn btn-light dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown">
								<span className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{width:32,height:32}}>👤</span>
								<span>Cuenta</span>
							</button>
							<ul className="dropdown-menu dropdown-menu-end">
								<li><Link className="dropdown-item" to="/mi-cuenta">Mi cuenta</Link></li>
								<li><button className="dropdown-item text-danger" onClick={logout}>Cerrar sesión</button></li>
							</ul>
						</div>
					) : (
						<Link className="btn btn-primary" to="/login">Iniciar sesión</Link>
					)}
				</div>
			</div>
		</nav>
	);
}