import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./store";
import { Login } from "./pages/Login";
import { Manufacturer } from "./pages/Manufacturer";
import { Distributor } from "./pages/Distributor";
import { Pharmacist } from "./pages/Pharmacist";
import { Consumer } from "./pages/Consumer";
import { Alerts } from "./pages/Alerts";
import type { ReactNode } from "react";

function Nav() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const home = `/${user.role}`;
  return (
    <nav>
      <span className="brand">MedGuard</span>
      <NavLink to={home}>Dashboard</NavLink>
      <NavLink to="/consumer/verify">Verify</NavLink>
      <NavLink to="/alerts">Alerts</NavLink>
      <span className="muted" style={{ marginLeft: "auto" }}>
        {user.name} ({user.role})
      </span>
      <button
        className="secondary"
        onClick={() => {
          setUser(null);
          navigate("/login");
        }}
      >
        Logout
      </button>
    </nav>
  );
}

function Guard({ role, children }: { role: string; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}

const SUPPLY_CHAIN_ROLES = ["manufacturer", "distributor", "pharmacist"];

function SupplyChainOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!SUPPLY_CHAIN_ROLES.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Nav />
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to={user ? `/${user.role}` : "/login"} replace />} />
          <Route path="/manufacturer" element={<Guard role="manufacturer"><Manufacturer /></Guard>} />
          <Route path="/distributor" element={<Guard role="distributor"><Distributor /></Guard>} />
          <Route path="/pharmacist" element={<Guard role="pharmacist"><Pharmacist /></Guard>} />
          <Route path="/consumer" element={<Guard role="consumer"><Consumer /></Guard>} />
          <Route path="/consumer/verify" element={<Consumer />} />
          <Route path="/alerts" element={<SupplyChainOnly><Alerts /></SupplyChainOnly>} />
          <Route path="*" element={<Navigate to={user ? `/${user.role}` : "/login"} replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
