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
				<div className="fw-semibold">${worker?.hourly_rate ?? 350}/hr</div>
			</div>
		</div>
	);
}