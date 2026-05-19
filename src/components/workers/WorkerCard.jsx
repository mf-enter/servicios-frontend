export default function WorkerCard({ worker }) {
	const initials = (worker?.name?.[0] || "W") + (worker?.lastname?.[0] || "");
	return (
		<div className="card h-100 shadow-sm border-0">
			<div className="card-body">
				<div className="d-flex align-items-center gap-3">
					<div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{width:46,height:46}}>
						{initials.toUpperCase()}
					</div>
					<div>
						<div className="fw-semibold">{worker?.name} {worker?.lastname}</div>
						<div className="text-primary">{worker?.specialty ?? worker?.bio ?? "Profesional"}</div>
					</div>
				</div>
				<p className="text-muted mt-3 mb-2">{worker?.bio ?? "Profesional verificado disponible para servicios a domicilio."}</p>
				<div className="mb-3 p-2 bg-light rounded-3 text-center">
					<small className="text-muted d-block mb-1">Contrata, agenda y te damos tu cotización</small>
					<div className="fw-semibold text-primary">Contrata y solicita tu cotización</div>
				</div>
			</div>
		</div>
	);
}