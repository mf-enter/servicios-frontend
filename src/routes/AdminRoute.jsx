import { Navigate } from "react-router-dom";

export default function AdminRoute({children}){
  const token = localStorage.getItem("token");
  if(!token) return <Navigate to="/login" replace />;

  try{
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    const role = payload?.role;
    if(role === "admin") return children;
    return <Navigate to="/acceso-denegado" replace />;
  }catch(e){
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }
}