import { Button } from "@mantle/ui";
import { redirect } from "next/navigation";
import { t } from "../../i18n.ts";
import { resolveRequestTenant } from "../../server/tenant.ts";
import { sendSignInCode, signInWithCode, signInWithPassword } from "../actions.ts";

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

function BarChartSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function LightbulbSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
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

function LockSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
      {/* Left: brand panel with office photo — decorative */}
      <div className="sign-in-brand" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sign-in-photo" src="/images/sunu-office.jpg" alt="" />
        <div className="sign-in-photo-shade" />

        <div className="sign-in-branding">
          <span className="sign-in-brand-mark">SUNU</span>
          <span className="sign-in-brand-divider" />
          <div className="sign-in-brand-name">
            <strong>{t("nav.product_name")}</strong>
            <span>{t("nav.product_tagline")}</span>
          </div>
        </div>

        <div className="sign-in-copy">
          <h1>
            {t("auth.tagline_1")}<br />
            {t("auth.tagline_2")}<br />
            {t("auth.tagline_3")}
          </h1>
          <div className="sign-in-rule" />
          <p>{t("auth.tagline_description")}</p>
        </div>

        <div className="sign-in-benefits-grid">
          <div className="sign-in-benefit"><BookOpenSvg /><span>{t("auth.benefits.access_resources")}</span></div>
          <div className="sign-in-benefit"><GraduationCapSvg /><span>{t("auth.benefits.learning_paths")}</span></div>
          <div className="sign-in-benefit"><BarChartSvg /><span>{t("auth.benefits.track_progress")}</span></div>
          <div className="sign-in-benefit"><LightbulbSvg /><span>{t("auth.benefits.build_expertise")}</span></div>
        </div>
      </div>

      {/* Right: floating form card */}
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
              <form action={signInWithCode}>
                <div className="alert alert-info" role="status">
                  <p>{t("auth.code_sent")}</p>
                </div>
                <label className="field">
                  {t("auth.code")}
                  <input className="input" name="code" inputMode="numeric" autoComplete="one-time-code" required />
                </label>
                <Button type="submit" style={{ width: "100%", height: 48, fontSize: 16, fontWeight: 600 }}>
                  {t("auth.sign_in")}
                </Button>
              </form>
            ) : (
              <>
                <form action={signInWithPassword}>
                  <div>
                    <label htmlFor="si-email" className="sign-in-label">{t("auth.email")}</label>
                    <div className="sign-in-field">
                      <UserSvg />
                      <input id="si-email" name="email" type="email" autoComplete="username" required placeholder={t("auth.email_placeholder")} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="si-password" className="sign-in-label">{t("auth.password")}</label>
                    <div className="sign-in-field">
                      <LockSvg />
                      <input id="si-password" name="password" type="password" autoComplete="current-password" required placeholder={t("auth.password_placeholder")} />
                    </div>
                  </div>
                  <Button type="submit" style={{ width: "100%", height: 48, fontSize: 16, fontWeight: 600 }}>
                    {t("auth.sign_in")}
                  </Button>
                </form>

                <hr className="divider" />
                <p style={{ fontWeight: 600, margin: "0 0 12px", fontSize: 15 }}>{t("auth.or_code_heading")}</p>
                <form action={sendSignInCode}>
                  <div>
                    <label htmlFor="si-email-code" className="sign-in-label">{t("auth.email")}</label>
                    <div className="sign-in-field">
                      <UserSvg />
                      <input id="si-email-code" name="email" type="email" autoComplete="username" required placeholder={t("auth.email_placeholder")} />
                    </div>
                  </div>
                  <Button type="submit" variant="secondary" style={{ width: "100%", height: 48 }}>
                    {t("auth.send_code")}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
