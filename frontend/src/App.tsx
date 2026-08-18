import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./store";
import { useTheme } from "./theme";
import { Login } from "./pages/Login";
import { Manufacturer } from "./pages/Manufacturer";
import { Distributor } from "./pages/Distributor";
import { Pharmacist } from "./pages/Pharmacist";
import { Consumer } from "./pages/Consumer";
import { Alerts } from "./pages/Alerts";
import { BellIcon, HomeIcon, LogoutIcon, MoonIcon, ScanIcon, ShieldIcon, SunIcon } from "./components/icons";
import type { ReactNode } from "react";

function BrandMark() {
  return (
    <span className="brand-mark">
      <ShieldIcon size={16} />
    </span>
  );
}

function ThemeToggle({ theme, isAuto, toggle }: { theme: string; isAuto: boolean; toggle: () => void }) {
  return (
    <button
      className="icon-btn"
      onClick={toggle}
      title={isAuto ? `Theme (following system) — switch to ${theme === "dark" ? "light" : "dark"}` : `Theme — switch to ${theme === "dark" ? "light" : "dark"}`}
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function Nav() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { theme, isAuto, toggle } = useTheme();

  const logout = () => {
    setUser(null);
    navigate("/login");
  };

  return (
    <>
      <div className="tricolor" aria-hidden="true" />

      {!user ? (
        <header className="nav nav--public">
          <div className="nav-inner">
            <span className="brand"><BrandMark /> MedGuard</span>
            <div className="nav-right"><ThemeToggle theme={theme} isAuto={isAuto} toggle={toggle} /></div>
          </div>
        </header>
      ) : (
        <>
          <header className="nav">
            <div className="nav-inner">
              <span className="brand"><BrandMark /> MedGuard</span>
              <nav className="nav-links">
                <NavLink to={`/${user.role}`}>Dashboard</NavLink>
                <NavLink to="/consumer/verify">Verify</NavLink>
                <NavLink to="/alerts">Alerts</NavLink>
              </nav>
              <div className="nav-right">
                <span className="user-chip"><strong>{user.name}</strong> · {user.role}</span>
                <ThemeToggle theme={theme} isAuto={isAuto} toggle={toggle} />
                <button className="btn btn-ghost small" onClick={logout}>Logout</button>
              </div>
            </div>
          </header>

          <nav className="tabbar">
            <div className="tabbar-inner">
              <NavLink to={`/${user.role}`} className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
                <HomeIcon />Dashboard
              </NavLink>
              <NavLink to="/consumer/verify" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
                <ScanIcon />Verify
              </NavLink>
              <NavLink to="/alerts" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
                <BellIcon />Alerts
              </NavLink>
              <button className="tab" onClick={toggle} title="Toggle color theme" aria-label="Toggle color theme">
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <button className="tab" onClick={logout} aria-label="Logout">
                <LogoutIcon />Logout
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}

function Guard({ role, children }: { role: string; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Nav />
      <main className="page">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to={user ? `/${user.role}` : "/login"} replace />} />
          <Route path="/manufacturer" element={<Guard role="manufacturer"><Manufacturer /></Guard>} />
          <Route path="/distributor" element={<Guard role="distributor"><Distributor /></Guard>} />
          <Route path="/pharmacist" element={<Guard role="pharmacist"><Pharmacist /></Guard>} />
          <Route path="/consumer" element={<Guard role="consumer"><Consumer /></Guard>} />
          <Route path="/consumer/verify" element={<Consumer />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="*" element={<Navigate to={user ? `/${user.role}` : "/login"} replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
