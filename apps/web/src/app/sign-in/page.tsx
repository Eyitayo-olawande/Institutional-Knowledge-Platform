import { Button } from "@mantle/ui";
import { redirect } from "next/navigation";
import { t } from "../../i18n.ts";
import { resolveRequestTenant } from "../../server/tenant.ts";
import { signInWithCode, signInWithPassword } from "../actions.ts";
import { PasswordField } from "./PasswordField.tsx";

const ERRORS = new Set(["wrong_details", "wrong_code"]);

function BookOpenSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function GraduationCapSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function AwardSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function BarChartSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function UserSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function ArrowRightSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 18, height: 18, flexShrink: 0 }}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code_sent?: string }>;
}) {
  const resolution = await resolveRequestTenant();
  if (!resolution.ok) redirect("/");
  const { error, code_sent: codeSent } = await searchParams;

  return (
    <div className="sign-in">
      {/* Left: brand panel with office photo — decorative, aria-hidden */}
      <div className="sign-in-brand" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sign-in-photo" src="/images/sunu-office.jpg" alt="" />
        <div className="sign-in-photo-shade" />

        {/* Logo row: SUNU brand mark | divider | eLibrary product identity */}
        <div className="sign-in-branding">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sign-in-logo" src="/images/sunu-logo.webp" alt="SUNU Assurances" />
          <span className="sign-in-brand-divider" />
          <div className="sign-in-brand-name">
            <strong>{t("nav.product_name")}</strong>
            <span>{t("nav.product_tagline")}</span>
          </div>
        </div>

        {/* Spacer to push copy toward the lower-middle of the visible panel */}
        <div style={{ flex: 1, minHeight: 60 }} />

        <div className="sign-in-copy">
          <h1>
            {t("auth.tagline_1")}<br />
            {t("auth.tagline_2")}<br />
            {t("auth.tagline_3")}
          </h1>
          <div className="sign-in-rule" />
          <p>{t("auth.tagline_description")}</p>
        </div>

        {/* Burgundy wave footer with four benefits */}
        <div className="sign-in-benefits-footer">
          <svg className="sign-in-wave-svg" viewBox="0 0 1200 54" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,42 C280,4 560,54 900,22 C1050,10 1130,34 1200,18 L1200,54 L0,54 Z" fill="#86112A" />
          </svg>
          <div className="sign-in-benefits-items">
            <div className="sign-in-benefit"><BookOpenSvg /><span>{t("auth.benefits.access_resources")}</span></div>
            <div className="sign-in-benefit"><GraduationCapSvg /><span>{t("auth.benefits.learning_paths")}</span></div>
            <div className="sign-in-benefit"><AwardSvg /><span>{t("auth.benefits.earn_certificates")}</span></div>
            <div className="sign-in-benefit"><BarChartSvg /><span>{t("auth.benefits.build_expertise")}</span></div>
          </div>
        </div>
      </div>

      {/* Right: auth panel */}
      <div className="sign-in-form">
        <div className="sign-in-panel">
          <div className="sign-in-card">
            <h2>
              {t("auth.welcome_heading")}<br />
              <span style={{ color: "var(--mantle-color-primary)" }}>{t("nav.product_name")}</span>
            </h2>
            <p className="sign-in-card-sub">{t("auth.welcome_sub")}</p>

            {error && ERRORS.has(error) ? (
              <div className="alert alert-danger" role="alert">
                <p>{t(`auth.errors.${error}`)}</p>
              </div>
            ) : null}

            {codeSent ? (
              /* Email code entry — shown only when ?code_sent=1 (email OTP flow, ADR 0008 deferred) */
              <form action={signInWithCode}>
                <div className="alert alert-info" role="status">
                  <p>{t("auth.code_sent")}</p>
                </div>
                <label className="field">
                  {t("auth.code")}
                  <input className="input" name="code" inputMode="numeric" autoComplete="one-time-code" required />
                </label>
                <Button type="submit" style={{ width: "100%", height: 50, fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {t("auth.sign_in")} <ArrowRightSvg />
                </Button>
              </form>
            ) : (
              <form action={signInWithPassword}>
                <div>
                  <label htmlFor="si-email" className="sign-in-label">{t("auth.email")}</label>
                  <div className="sign-in-field">
                    <UserSvg />
                    <input
                      id="si-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      placeholder={t("auth.email_placeholder")}
                    />
                  </div>
                </div>

                <PasswordField
                  label={t("auth.password")}
                  placeholder={t("auth.password_placeholder")}
                />

                <Button
                  type="submit"
                  style={{
                    width: "100%", height: 50, fontSize: 16, fontWeight: 600, marginTop: 4,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {t("auth.sign_in")} <ArrowRightSvg />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
