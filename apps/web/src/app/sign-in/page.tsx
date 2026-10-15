import { Button, color, space } from "@mantle/ui";
import { redirect } from "next/navigation";
import { t } from "../../i18n.ts";
import { resolveRequestTenant } from "../../server/tenant.ts";
import { sendSignInCode, signInWithCode, signInWithPassword } from "../actions.ts";

const field = { display: "grid", gap: space.xs, marginBottom: space.md } as const;
const input = { minHeight: 44, padding: space.sm, fontSize: 16 } as const;
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
    <main style={{ padding: space.md, maxWidth: 480 }}>
      <h1>{t("auth.sign_in_to", { name: resolution.tenant.name })}</h1>
      {error && ERRORS.has(error) && <p role="alert" style={{ color: color.danger }}>{t(`auth.errors.${error}`)}</p>}

      {codeSent ? (
        <form action={signInWithCode}>
          <p role="status">{t("auth.code_sent")}</p>
          <label style={field}>
            {t("auth.code")}
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required style={input} />
          </label>
          <Button type="submit">{t("auth.sign_in")}</Button>
        </form>
      ) : (
        <>
          <form action={signInWithPassword}>
            <label style={field}>
              {t("auth.email")}
              <input name="email" type="email" autoComplete="username" required style={input} />
            </label>
            <label style={field}>
              {t("auth.password")}
              <input name="password" type="password" autoComplete="current-password" required style={input} />
            </label>
            <Button type="submit">{t("auth.sign_in")}</Button>
          </form>

          <h2>{t("auth.or_code_heading")}</h2>
          <form action={sendSignInCode}>
            <label style={field}>
              {t("auth.email")}
              <input name="email" type="email" autoComplete="username" required style={input} />
            </label>
            <Button type="submit" variant="secondary">{t("auth.send_code")}</Button>
          </form>
        </>
      )}
    </main>
  );
}
