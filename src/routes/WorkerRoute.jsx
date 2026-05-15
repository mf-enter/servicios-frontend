import { Navigate } from "react-router-dom";

export default function WorkerRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    if (payload?.role === "worker") {
      return children;
    }
    return <Navigate to="/login" replace />;
  } catch (error) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }
}
