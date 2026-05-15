import { Link } from "react-router-dom";
import PublicLayout from "../../components/layout/PublicLayout";

export default function Home(){
	return(
		<PublicLayout>
			<div className="row g-4 align-items-start">
				<div className="col-12 col-lg-6">
					<div className="p-4 p-lg-5 bg-white border rounded-4 shadow-soft">
						<span className="badge badge-soft rounded-pill px-3 py-2 mb-3">Trabajadores verificados</span>
						<h1 className="display-6 fw-bold">Encuentra al profesional <span className="text-primary">indicado</span> para tu hogar</h1>
						<p className="lead text-muted">Conectamos clientes con profesionales certificados en electricidad, plomería, carpintería y más.</p>
						<div className="d-flex gap-2 mt-3">
							<Link to="/trabajadores" className="btn btn-primary">Explorar trabajadores</Link>
							<Link to="/login" className="btn btn-outline-primary">Acceso único</Link>
						</div>
					</div>
				</div>

				<div className="col-12 col-lg-6">
					<div className="row g-3">
						{["Electricistas","Plomeros","Carpinteros","Pintores","Cerrajeros","Limpieza"].map((t)=>(
							<Link key={t} to={`/trabajadores?servicio=${encodeURIComponent(t)}`} className="col-6" style={{textDecoration: 'none', color: 'inherit'}}>
								<div className="card h-100 shadow-sm" style={{cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}} onMouseEnter={(e)=>{e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow='0 8px 16px rgba(0,0,0,0.1)'}} onMouseLeave={(e)=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=''}}>
									<div className="card-body">
										<div className="rounded-3 bg-soft text-primary d-inline-flex align-items-center justify-content-center mb-3" style={{width:40,height:40}}>⚡</div>
										<h5 className="mb-1">{t}</h5>
										<small className="text-muted">Disponibles ahora</small>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			</div>

			{/* ✅ segundo acceso login abajo */}
			<div className="mt-5 text-center">
				<h2 className="section-title">¿Ya tienes cuenta?</h2>
				<p className="text-muted">Inicia sesión para contratar servicios, revisar tu historial o entrar al panel de trabajador.</p>
				<Link to="/login" className="btn btn-primary">Iniciar sesión</Link>
			</div>
		</PublicLayout>
	);
}