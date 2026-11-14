import { Button, Card } from "@mantle/ui";
import { t } from "../../i18n.ts";
import { accessAction } from "./actions.ts";

export default async function AptitudeAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantle-color-bg_subtle)", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Card>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 22 }}>{t("aptitude.access_heading")}</h1>
          <p style={{ marginTop: 0, marginBottom: 20, color: "var(--mantle-color-text_muted)", fontSize: 14 }}>{t("aptitude.access_sub")}</p>

          {params.error ? (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
              <p style={{ margin: 0 }}>{t("aptitude.invalid_credentials")}</p>
            </div>
          ) : null}

          <form action={accessAction}>
            <label className="field">
              {t("aptitude.ref_label")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input
                className="input"
                name="candidateRef"
                placeholder="e.g. CAN-2026-001"
                autoCapitalize="characters"
                autoComplete="off"
                required
              />
            </label>
            <label className="field">
              {t("aptitude.pin_label")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input
                className="input"
                name="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                minLength={4}
                placeholder="4-digit PIN"
                autoComplete="off"
                required
                style={{ letterSpacing: 4, maxWidth: 120 }}
              />
            </label>
            <Button type="submit" style={{ width: "100%", marginTop: 8 }}>{t("aptitude.start_btn")}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
