import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayout({children}){
	return (
		<div className="d-flex flex-column min-vh-100 bg-body-tertiary">
			<div className="d-flex flex-grow-1">
				<div style={{width: 260, minWidth: 260}} className="d-none d-lg-block">
					<AdminSidebar />
				</div>
				<div className="flex-grow-1">
					<AdminHeader />
					<div className="container-fluid py-4">{children}</div>
				</div>
			</div>
		</div>
	);
}