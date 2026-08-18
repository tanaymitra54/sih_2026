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

  return (
    <div className="card" style={{ maxWidth: 420, margin: "4rem auto" }}>
      <h1>MedGuard</h1>
      <p className="muted">Counterfeit Medicine Detection · QR + on-chain verification at pharmacy level</p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "1rem 0" }}>
        {Object.entries(DEMO_USERS).map(([k, v]) => (
          <button key={k} className="secondary" onClick={() => setEmail(v.email)}>
            {v.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit" style={{ width: "100%" }}>Login</button>
      </form>
    </div>
  );
}
