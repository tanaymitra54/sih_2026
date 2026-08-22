import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../store";
import { useI18n } from "../i18n";
import { LoginHero } from "../components/LoginHero";
import { ArrowRightIcon } from "../components/icons";

const DEMO_USERS: Record<string, { email: string; labelKey: string; code: string }> = {
  mfr: { email: "mfr@medguard.in", labelKey: "login.role.manufacturer", code: "MFR" },
  dist: { email: "dist@medguard.in", labelKey: "login.role.distributor", code: "DST" },
  pharma: { email: "pharma@medguard.in", labelKey: "login.role.pharmacist", code: "RX" },
  consumer: { email: "consumer@medguard.in", labelKey: "login.role.consumer", code: "USR" },
  admin: { email: "admin@medguard.in", labelKey: "login.role.admin", code: "ADM" },
};

export function Login() {
  const [email, setEmail] = useState("mfr@medguard.in");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setUser = useAuth((s) => s.setUser);
  const navigate = useNavigate();
  const { t } = useI18n();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("medguard_token", data.token);
      setUser(data.user);
      navigate(`/${data.user.role}`);
    } catch (e: any) {
      if (!e.response) setError("Cannot reach the server — is the backend running? (npm run dev)");
      else if (e.response.status === 401) setError("Invalid credentials — try the demo accounts with password demo1234");
      else setError(e.response.data?.error ?? `Login failed (${e.response.status})`);
    } finally {
      setLoading(false);
    }
  }

  const activeRole = Object.keys(DEMO_USERS).find((k) => DEMO_USERS[k].email === email);

  return (
    <div className="login-page">
      <div className="login-shell">
        <LoginHero />

        <aside className="login-card">
          <header className="login-head">
            <h2>Sign in</h2>
            <p>{t("login.subtitle")}</p>
          </header>

          <form className="login-form" onSubmit={submit}>
            <fieldset className="login-roles">
              <legend>Select demo role</legend>
              <div className="role-grid" role="tablist" aria-label="Select demo role">
                {Object.entries(DEMO_USERS).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={activeRole === k}
                    className={`role-pill${activeRole === k ? " active" : ""}`}
                    onClick={() => setEmail(v.email)}
                  >
                    <span className="role-code">{v.code}</span>
                    <span className="role-label">{t(v.labelKey)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="login-field">
              <label htmlFor="login-email">{t("login.email")}</label>
              <input
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                spellCheck={false}
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">{t("login.password")}</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="error" role="alert" style={{ marginBottom: "0.75rem" }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-green btn-block" disabled={loading}>
              <span>{loading ? "Authenticating…" : t("login.submit")}</span>
              <ArrowRightIcon />
            </button>
          </form>

          <footer className="login-foot">
            <span>{t("login.demo")} <strong>demo1234</strong></span>
          </footer>
        </aside>
      </div>
    </div>
  );
}
