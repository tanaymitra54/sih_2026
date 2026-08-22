import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../store";
import { useI18n } from "../i18n";
import { BrandLockup } from "../components/BrandLockup";
import { ArrowRightIcon, CheckIcon, ScanIcon } from "../components/icons";

const DEMO_USERS: Record<string, { email: string; labelKey: string }> = {
  mfr: { email: "mfr@medguard.in", labelKey: "login.role.manufacturer" },
  dist: { email: "dist@medguard.in", labelKey: "login.role.distributor" },
  pharma: { email: "pharma@medguard.in", labelKey: "login.role.pharmacist" },
  consumer: { email: "consumer@medguard.in", labelKey: "login.role.consumer" },
  admin: { email: "admin@medguard.in", labelKey: "login.role.admin" },
};

export function Login() {
  const [email, setEmail] = useState("mfr@medguard.in");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const setUser = useAuth((s) => s.setUser);
  const navigate = useNavigate();
  const { t } = useI18n();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("medguard_token", data.token);
      setUser(data.user);
      navigate(`/${data.user.role}`);
    } catch (e: any) {
      if (!e.response) setError("Cannot reach the server — is the backend running? (npm run dev)");
      else if (e.response.status === 401) setError("Invalid credentials — try the demo accounts with password demo1234");
      else setError(e.response.data?.error ?? `Login failed (${e.response.status})`);
    }
  }

  const activeRole = Object.keys(DEMO_USERS).find((k) => DEMO_USERS[k].email === email);

  return (
    <div className="login-wrap">
      <div className="login-story">
        <BrandLockup />
        <p className="eyebrow">Trusted medicine infrastructure</p>
        <h2>Every pack has a story.<br /><em>Make it verifiable.</em></h2>
        <p className="story-copy">A quiet layer of protection for the people who make, move, dispense, and depend on medicine.</p>
        <div className="story-list">
          <span><CheckIcon size={15} /> Signed at source</span>
          <span><ScanIcon size={15} /> Traced in motion</span>
          <span><CheckIcon size={15} /> Verified at the point of care</span>
        </div>
        <div className="reference-card" aria-label="Live verification reference">
          <img src="/reference-card.png" alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          <div className="reference-card-fallback">
            <div><span>▥ 24K</span><span>◷ Today, 8:00 PM</span><span>● Live network</span></div>
            <strong>Every pack carries a verifiable chain.</strong>
            <div className="reference-actions"><span>Minted · 1¢</span><span>Verified · 99¢</span></div>
          </div>
        </div>
        <div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" />
      </div>
      <div className="login-card animate-in">
        <div className="login-brand">
          <BrandLockup />
          <p className="muted">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={submit}>
          <div className="seg" role="tablist" aria-label="Select demo role">
            {Object.entries(DEMO_USERS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={activeRole === k}
                className={activeRole === k ? "active" : ""}
                onClick={() => setEmail(v.email)}
              >
                {t(v.labelKey)}
              </button>
            ))}
          </div>

          <div className="field">
            <label htmlFor="login-email">{t("login.email")}</label>
            <input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t("login.password")}</label>
            <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-saffron btn-block" style={{ marginTop: 4 }}>{t("login.submit")} <ArrowRightIcon /></button>
        </form>

        <p className="caption" style={{ textAlign: "center", marginTop: 14 }}>{t("login.demo")} <strong>demo1234</strong></p>
      </div>
    </div>
  );
}
