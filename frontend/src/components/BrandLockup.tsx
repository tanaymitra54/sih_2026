import { useI18n } from "../i18n";

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`brand-lockup${compact ? " compact" : ""}`}>
      <img src="/oryyn-logo.svg" alt={`${t("brand")} logo`} />
      <span>{t("brand")}</span>
    </span>
  );
}
