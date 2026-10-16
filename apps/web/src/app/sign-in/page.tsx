import { Button, Card } from "@mantle/ui";
import { redirect } from "next/navigation";
import { t } from "../../i18n.ts";
import { resolveRequestTenant } from "../../server/tenant.ts";
import { sendSignInCode, signInWithCode, signInWithPassword } from "../actions.ts";

const ERRORS = new Set(["wrong_details", "wrong_code"]);

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code_sent?: string }>;
}) {
  const resolution = await resolveRequestTenant();
  if (!resolution.ok) redirect("/");
  const { error, code_sent: codeSent } = await searchParams;

  return (
    <div className="centered">
      <Card className="panel">
        <p style={{ margin: "0 0 18px", fontWeight: 700, fontSize: 18, color: "var(--mantle-color-primary)" }}>{resolution.tenant.name}</p>
        <h1>{t("auth.sign_in")}</h1>
        <p className="sub" style={{ marginBottom: 20 }}>{t("auth.sign_in_hint")}</p>
        {error && ERRORS.has(error) ? (
          <div className="alert alert-danger" role="alert"><p>{t(`auth.errors.${error}`)}</p></div>
        ) : null}

        {codeSent ? (
          <form action={signInWithCode}>
            <div className="alert alert-info" role="status"><p>{t("auth.code_sent")}</p></div>
            <label className="field">
              {t("auth.code")}
              <input className="input" name="code" inputMode="numeric" autoComplete="one-time-code" required />
            </label>
            <Button type="submit" style={{ width: "100%" }}>{t("auth.sign_in")}</Button>
          </form>
        ) : (
          <>
            <form action={signInWithPassword}>
              <label className="field">
                {t("auth.email")}
                <input className="input" name="email" type="email" autoComplete="username" required />
              </label>
              <label className="field">
                {t("auth.password")}
                <input className="input" name="password" type="password" autoComplete="current-password" required />
              </label>
              <Button type="submit" style={{ width: "100%" }}>{t("auth.sign_in")}</Button>
            </form>

            <hr className="divider" />
            <h2>{t("auth.or_code_heading")}</h2>
            <form action={sendSignInCode}>
              <label className="field">
                {t("auth.email")}
                <input className="input" name="email" type="email" autoComplete="username" required />
              </label>
              <Button type="submit" variant="secondary" style={{ width: "100%" }}>{t("auth.send_code")}</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
