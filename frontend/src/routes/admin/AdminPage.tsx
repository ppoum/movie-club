import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import AdminLoginPage from "./AdminLoginPage";
import AdminDashboardPage from "./AdminDashboardPage";

export default function AdminPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function check_auth_status() {
      try {
        const res = await fetch("/api/auth");
        if (res.status == 401) {
          navigate("/admin/login");
          return;
        }
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        if (location.pathname === "/admin" || location.pathname === "/admin/") {
          // If auth and at /admin, then redirect to dashboard
          navigate("/admin/dashboard");
        }
      } catch (err) {
        console.log("Error while checking auth status:", err);
      }
    }
    check_auth_status();
  }, [navigate]);

  return (
    <div>
      <Routes>
        <Route
          path="/login"
          element={
            <AdminLoginPage
              onLoginSucces={() => navigate("/admin/dashboard")}
            />
          }
        />
        <Route path="/dashboard" element={<AdminDashboardPage />} />
      </Routes>
    </div>
  );
}
