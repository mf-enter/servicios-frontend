import { Navigate } from "react-router-dom";
export default function PrivateRoute({ children }) {
  const t = localStorage.getItem("token");
  return t ? children : <Navigate to="/login" />;
}
