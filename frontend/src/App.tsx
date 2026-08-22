import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "./store";
import { useTheme } from "./theme";
import { useI18n, LANGS } from "./i18n";
import { Login } from "./pages/Login";
import { Manufacturer } from "./pages/Manufacturer";
import { Distributor } from "./pages/Distributor";
import { Pharmacist } from "./pages/Pharmacist";
import { Consumer } from "./pages/Consumer";
import { Alerts } from "./pages/Alerts";
import { HeatmapV2Page } from "./pages/HeatmapV2";
import { OfflineBanner } from "./components/OfflineBanner";
import { BrandLockup } from "./components/BrandLockup";
import { BellIcon, HomeIcon, LogoutIcon, MoonIcon, ScanIcon, SunIcon } from "./components/icons";
import type { ReactNode } from "react";

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

function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <select
      className="lang-select"
      value={lang}
      onChange={(e) => setLang(e.target.value as typeof lang)}
      aria-label="Choose language"
      title="भाषा / Language"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>{l.native}</option>
      ))}
    </select>
  );
}

function Nav() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { theme, isAuto, toggle } = useTheme();
  const { t } = useI18n();

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
            <BrandLockup />
            <div className="nav-right">
              <LanguageToggle />
              <ThemeToggle theme={theme} isAuto={isAuto} toggle={toggle} />
            </div>
          </div>
        </header>
      ) : (
        <>
          <aside className="side-rail">
            <div className="rail-brand"><BrandLockup /></div>
            <div className="rail-kicker">Operations console</div>
            <nav className="rail-links" aria-label="Primary navigation">
              <NavLink to={`/${user.role}`}><HomeIcon /> <span>{t("nav.dashboard")}</span></NavLink>
              <NavLink to="/consumer/verify"><ScanIcon /> <span>{t("nav.verify")}</span></NavLink>
              <NavLink to="/alerts"><BellIcon /> <span>{t("nav.alerts")}</span></NavLink>
            </nav>
            <div className="rail-footer">
              <span className="status-pip" /> Systems operational
            </div>
          </aside>
          <header className="nav">
            <div className="nav-inner">
              <BrandLockup compact />
              <span className="top-context">{user.role} workspace <span className="status-pip" /></span>
              <div className="nav-right">
                <span className="user-chip"><strong>{user.name}</strong> · {user.role}</span>
                <LanguageToggle />
                <ThemeToggle theme={theme} isAuto={isAuto} toggle={toggle} />
                <button className="btn btn-ghost small" onClick={logout}>{t("nav.logout")}</button>
              </div>
            </div>
          </header>

          <nav className="tabbar">
            <div className="tabbar-inner">
              <NavLink to={`/${user.role}`} className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
                <HomeIcon />{t("nav.dashboard")}
              </NavLink>
              <NavLink to="/consumer/verify" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
                <ScanIcon />{t("nav.verify")}
              </NavLink>
              <NavLink to="/alerts" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
                <BellIcon />{t("nav.alerts")}
              </NavLink>
              <button className="tab" onClick={toggle} title="Toggle color theme" aria-label="Toggle color theme">
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                {theme === "dark" ? t("nav.light") : t("nav.dark")}
              </button>
              <button className="tab" onClick={logout} aria-label="Logout">
                <LogoutIcon />{t("nav.logout")}
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
      <OfflineBanner />
      <Toaster position="top-right" richColors closeButton />
      <Nav />
       <main className={`page ${user ? "page--app" : "page--public"}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to={user ? `/${user.role}` : "/login"} replace />} />
          <Route path="/manufacturer" element={<Guard role="manufacturer"><Manufacturer /></Guard>} />
          <Route path="/distributor" element={<Guard role="distributor"><Distributor /></Guard>} />
          <Route path="/pharmacist" element={<Guard role="pharmacist"><Pharmacist /></Guard>} />
          <Route path="/consumer" element={<Guard role="consumer"><Consumer /></Guard>} />
          <Route path="/consumer/verify" element={<Consumer />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/heatmap-v2" element={<HeatmapV2Page />} />
          <Route path="*" element={<Navigate to={user ? `/${user.role}` : "/login"} replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
