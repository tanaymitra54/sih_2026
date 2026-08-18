import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../store";

const DEMO_USERS: Record<string, { email: string; label: string }> = {
  mfr: { email: "mfr@medguard.in", label: "Manufacturer" },
  dist: { email: "dist@medguard.in", label: "Distributor" },
  pharma: { email: "pharma@medguard.in", label: "Pharmacist" },
  consumer: { email: "consumer@medguard.in", label: "Consumer" },
};

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function Login() {
  const [email, setEmail] = useState("mfr@medguard.in");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const setUser = useAuth((s) => s.setUser);
  const navigate = useNavigate();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("medguard_token", data.token);
      setUser(data.user);
      navigate(`/${data.user.role}`);
    } catch {
      setError("Invalid credentials");
    }
  }

  const activeRole = Object.keys(DEMO_USERS).find((k) => DEMO_USERS[k].email === email);

  return (
    <div className="login-wrap">
      <div className="login-card animate-in">
        <div className="login-brand">
          <span className="brand-mark"><ShieldIcon /></span>
          <h1>MedGuard</h1>
          <p className="muted">Counterfeit Medicine Detection · QR + on-chain verification at pharmacy level</p>
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
                {v.label}
              </button>
            ))}
          </div>

          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-saffron btn-block" style={{ marginTop: 4 }}>Login</button>
        </form>

        <p className="caption" style={{ textAlign: "center", marginTop: 14 }}>Demo accounts · password <strong>demo1234</strong></p>
      </div>
    </div>
  );
}
