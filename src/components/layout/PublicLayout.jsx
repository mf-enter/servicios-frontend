import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PublicLayout({children}){
	return(
		<div className="d-flex flex-column min-vh-100 bg-body-tertiary">
			<Navbar/>
			<main className="container py-5 flex-grow-1">{children}</main>
			<Footer/>
		</div>
	);
}