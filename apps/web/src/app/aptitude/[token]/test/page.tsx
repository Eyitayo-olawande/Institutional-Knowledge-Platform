import { getTestForCandidate, verifyToken } from "@mantle/db/tenant";
import { notFound, redirect } from "next/navigation";
import { t } from "../../../../i18n.ts";
import { tenantDb } from "../../../../server/session.ts";
import { resolveRequestTenant } from "../../../../server/tenant.ts";
import { submitTestAction } from "./actions.ts";

export default async function AptitudeTestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = verifyToken(token);
  if (!parsed) notFound();

  const resolution = await resolveRequestTenant();
  if (!resolution.ok) notFound();
  const db = tenantDb(resolution.tenant);

  const { testId, candidateId, attemptId } = parsed;
  if (attemptId === "pending") redirect(`/aptitude/${token}/start`);

  const data = await getTestForCandidate(db, testId, attemptId);
  if (!data) notFound();

  const { test, sections } = data;
  const durationMs = test.durationMinutes * 60 * 1000;
  const initialTimer = `${String(test.durationMinutes).padStart(2, "0")}:00`;

  return (
    <>
      <style>{`
        body { margin: 0; }
        .at-header { position: sticky; top: 0; z-index: 10; background: var(--mantle-color-bg); border-bottom: 1px solid var(--mantle-color-border); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .at-timer { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: 1px; }
        .at-timer.warning { color: #d97706; }
        .at-timer.urgent { color: #dc2626; }
        .at-body { max-width: 700px; margin: 0 auto; padding: 24px 16px 80px; }
        .at-section { margin-bottom: 32px; }
        .at-section h2 { font-size: 16px; color: var(--mantle-color-text_muted); font-weight: 600; border-bottom: 1px solid var(--mantle-color-border); padding-bottom: 8px; margin-bottom: 16px; }
        .at-question { margin-bottom: 20px; }
        .at-question p { margin: 0 0 10px; font-weight: 600; font-size: 15px; line-height: 1.5; }
        .at-option { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--mantle-color-border); margin-bottom: 6px; cursor: pointer; font-size: 14px; }
        .at-option:has(input:checked) { background: color-mix(in srgb, var(--mantle-color-brand) 10%, transparent); border-color: var(--mantle-color-brand); }
        .at-submit { position: fixed; bottom: 0; left: 0; right: 0; padding: 14px 24px; background: var(--mantle-color-bg); border-top: 1px solid var(--mantle-color-border); display: flex; gap: 12px; align-items: center; justify-content: flex-end; }
        .at-confirm { display: none; padding: 12px 16px; background: var(--mantle-color-bg_subtle); border: 1px solid var(--mantle-color-border); border-radius: 8px; font-size: 14px; }
        .at-confirm.show { display: block; }
      `}</style>

      <div className="at-header">
        <span style={{ fontWeight: 600 }}>{test.name}</span>
        <div>
          <span style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", marginRight: 8 }}>{t("aptitude.timer_label")}:</span>
          <span className="at-timer" id="at-timer" suppressHydrationWarning>{initialTimer}</span>
        </div>
      </div>

      <div className="at-body">
        <form id="at-form" action={submitTestAction}>
          <input type="hidden" name="token" value={token} />
          {sections.flatMap((section) =>
            section.questions.map((q) => (
              <input key={q.id} type="hidden" name="shown_q" value={q.id} />
            ))
          )}
          {sections.map((section) => (
            <div className="at-section" key={section.id}>
              <h2>
                {section.sectionKey === "general_aptitude"
                  ? t("aptitude_tests.sections.general_aptitude")
                  : t("aptitude_tests.sections.company_knowledge")}
              </h2>
              {section.questions.map((q, qi) => (
                <div className="at-question" key={q.id}>
                  <p>{qi + 1}. {q.questionText}</p>
                  {q.options.map((opt) => (
                    <label className="at-option" key={opt.id}>
                      <input type="radio" name={`q_${q.id}`} value={opt.id} />
                      {opt.optionText}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </form>
      </div>

      <div className="at-submit">
        <div className="at-confirm" id="at-confirm">
          <p style={{ margin: "0 0 10px" }}>{t("aptitude.confirm_submit")}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" form="at-form" className="btn btn-primary">{t("aptitude.submit_btn")}</button>
            <button type="button" className="btn btn-secondary" data-cancel-confirm="">Cancel</button>
          </div>
        </div>
        <button type="button" className="btn btn-primary" id="at-open-confirm">{t("aptitude.submit_btn")}</button>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var end = Date.now() + ${durationMs};
          var el = document.getElementById('at-timer');
          document.getElementById('at-open-confirm').addEventListener('click', function() {
            document.getElementById('at-confirm').classList.toggle('show');
          });
          document.querySelectorAll('[data-cancel-confirm]').forEach(function(b) {
            b.addEventListener('click', function() { document.getElementById('at-confirm').classList.remove('show'); });
          });
          function tick() {
            var rem = Math.max(0, Math.floor((end - Date.now()) / 1000));
            var m = Math.floor(rem / 60);
            var s = rem % 60;
            el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
            el.className = 'at-timer' + (rem <= 60 ? ' urgent' : rem <= 300 ? ' warning' : '');
            if (rem <= 0) { document.getElementById('at-form').submit(); return; }
            setTimeout(tick, 1000);
          }
          tick();
        })();
      ` }} />
    </>
  );
}
