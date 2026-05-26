// src/routes/AppRouter.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Register from "../pages/public/Register";
import Services from "../pages/public/Services";
import WorkersList from "../pages/public/WorkersList";
import WorkerDetail from "../pages/public/WorkerDetail";
import Dashboard from "../pages/admin/Dashboard";
import Users from "../pages/admin/Users";
import AccessDenied from "../pages/system/AccessDenied";
import NotFound from "../pages/system/NotFound";
import AdminRoute from "./AdminRoute";
import PublicLayout from "../components/layout/PublicLayout";
import AdminLayout from "../components/layout/AdminLayout";
import Account from "../pages/user/Account";
import WorkerRegister from "../pages/worker/WorkerRegister";
import WorkerPanel from "../pages/worker/WorkerPanel";
import Workers from "../pages/admin/Workers";
import WorkerRoute from "./WorkerRoute";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/trabajadores" element={<PublicLayout><WorkersList/></PublicLayout>} />
      <Route path="/trabajadores/:id" element={<PublicLayout><WorkerDetail/></PublicLayout>} />
      <Route path="/services" element={<PublicLayout><Services/></PublicLayout>} />
      <Route path="/servicios" element={<Navigate to="/services" replace />} />
      <Route path="/login" element={<PublicLayout><Login/></PublicLayout>} />
      <Route path="/worker-login" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<PublicLayout><Register/></PublicLayout>} />
      <Route path="/mi-cuenta" element={<PublicLayout><Account/></PublicLayout>} />
      <Route path="/worker-register" element={<PublicLayout><WorkerRegister/></PublicLayout>} />
      <Route path="/worker-panel" element={<WorkerRoute><PublicLayout><WorkerPanel/></PublicLayout></WorkerRoute>} />

      <Route path="/dashboard" element={<AdminRoute><AdminLayout><Dashboard/></AdminLayout></AdminRoute>} />
      <Route path="/dashboard/usuarios" element={<AdminRoute><AdminLayout><Users/></AdminLayout></AdminRoute>} />
      <Route path="/dashboard/trabajadores" element={<AdminRoute><AdminLayout><Workers/></AdminLayout></AdminRoute>} />
      <Route path="/dashboard/logs" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard/servicios" element={<Navigate to="/worker-panel" replace />} />
      <Route path="/dashboard/tipos-servicios" element={<Navigate to="/worker-panel" replace />} />
      <Route path="/dashboard/pagos" element={<Navigate to="/worker-panel" replace />} />
      <Route path="/dashboard/agenda-trabajadores" element={<Navigate to="/worker-panel" replace />} />

      <Route path="/acceso-denegado" element={<AccessDenied />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}