import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./store";
import { useTheme } from "./theme";
import { Login } from "./pages/Login";
import { Manufacturer } from "./pages/Manufacturer";
import { Distributor } from "./pages/Distributor";
import { Pharmacist } from "./pages/Pharmacist";
import { Consumer } from "./pages/Consumer";
import { Alerts } from "./pages/Alerts";
import type { ReactNode } from "react";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M4 12h16" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark">
      <ShieldIcon />
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
