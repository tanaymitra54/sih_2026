import { useI18n } from "../i18n";

export function LoginHero() {
  const { t } = useI18n();

  return (
    <section className="login-hero" aria-label="ORVYN overview">
      <p className="caption">{t("brand")} · anti-counterfeit verification</p>
      <h1 className="hero-title">
        <span className="hero-title-line">Every pack signed.</span>
        <span className="hero-title-accent">Every handoff recorded.</span>
      </h1>
      <p className="hero-lede">
        Scan a medicine's QR code to confirm its identity, custody history and
        current state against a tamper-evident ledger — from manufacturer to
        pharmacy to you.
      </p>
      <ul className="hero-stats">
        <li><strong>01</strong> Manufacturer mints packs with signed QR identities</li>
        <li><strong>02</strong> Distributors and pharmacists transfer custody by scanning</li>
        <li><strong>03</strong> Anyone verifies authenticity against the ledger</li>
      </ul>
    </section>
  );
}
