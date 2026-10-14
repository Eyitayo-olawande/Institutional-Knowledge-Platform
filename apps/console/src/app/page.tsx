import { t } from "../i18n.ts";

export default function Home() {
  return (
    <main>
      <h1>{t("app.title")}</h1>
      <p>{t("app.status")}</p>
    </main>
  );
}
