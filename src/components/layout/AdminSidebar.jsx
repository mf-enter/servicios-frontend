import { NavLink } from "react-router-dom";

const adminLinks = [
	{ to: "/dashboard", label: "Monitoreo General" },
	{ to: "/dashboard/usuarios", label: "CRUD Usuarios" },
	{ to: "/dashboard/trabajadores", label: "CRUD Trabajadores" },
];

export default function AdminSidebar(){
	return (
		<aside className="bg-white border-end p-3 h-100">
			<div className="fw-bold mb-3">Servicios Pro</div>
			<div className="d-grid gap-2">
				{adminLinks.map(link => (
					<NavLink
						key={link.to}
						to={link.to}
						className={({isActive}) => `btn text-start ${isActive ? "btn-primary" : "btn-outline-primary"}`}
					>
						{link.label}
					</NavLink>
				))}
			</div>
		</aside>
	);
}