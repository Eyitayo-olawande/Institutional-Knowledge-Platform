import { certificateByReference } from "@mantle/db/tenant";
import { notFound } from "next/navigation";
import { t } from "../../../i18n.ts";
import { tenantDb } from "../../../server/session.ts";
import { resolveRequestTenant } from "../../../server/tenant.ts";

export default async function CertificatePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const resolution = await resolveRequestTenant();
  if (!resolution.ok) notFound();
  const db = tenantDb(resolution.tenant);
  const cert = await certificateByReference(db, reference);
  if (!cert) notFound();

  const issueDate = cert.issuedAt.toISOString().slice(0, 10);
  const stageName = t(`paths.stages.${cert.stageKind}`);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, sans-serif; background: #f7f8fa; color: #111; }
        .cert-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; }
        .cert-card {
          background: #fff;
          border: 1px solid #e2e6ea;
          border-radius: 16px;
          padding: 48px 56px;
          max-width: 640px;
          width: 100%;
          text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
        }
        .cert-logo { margin-bottom: 28px; }
        .cert-logo-ring {
          width: 72px; height: 72px; border-radius: 50%;
          background: #eef2ff;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .cert-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #5b6a8a; margin: 0 0 8px; }
        .cert-heading { font-size: 28px; font-weight: 700; margin: 0 0 4px; color: #111; }
        .cert-heading span { color: #3b5bdb; }
        .cert-rule { width: 48px; height: 3px; background: #3b5bdb; border-radius: 2px; margin: 20px auto; }
        .cert-label { font-size: 13px; color: #5b6a8a; margin: 0 0 2px; }
        .cert-value { font-size: 18px; font-weight: 600; margin: 0 0 20px; color: #111; }
        .cert-meta { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; margin: 24px 0 0; border-top: 1px solid #e2e6ea; padding-top: 24px; }
        .cert-meta-item { text-align: center; }
        .cert-ref { font-size: 13px; font-family: monospace; color: #5b6a8a; margin: 20px 0 0; }
        .cert-verify { font-size: 12px; color: #8a94a6; margin: 6px 0 0; }
        @media print {
          body { background: #fff; }
          .cert-page { padding: 0; justify-content: flex-start; }
          .cert-card { box-shadow: none; border: none; border-radius: 0; padding: 32px; max-width: 100%; }
        }
        @media (max-width: 600px) {
          .cert-card { padding: 32px 20px; }
          .cert-heading { font-size: 22px; }
        }
      `}</style>
      <div className="cert-page">
        <div className="cert-card">
          <div className="cert-logo">
            <div className="cert-logo-ring" aria-hidden>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="17" stroke="#3b5bdb" strokeWidth="2" />
                <path d="M11 18l5 5 9-10" stroke="#3b5bdb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <p className="cert-eyebrow">{t("certificate.eyebrow")}</p>
          <h1 className="cert-heading">
            {t("certificate.heading_1")} <span>{t("certificate.heading_2")}</span>
          </h1>
          <div className="cert-rule" aria-hidden />
          <p className="cert-label">{t("certificate.awarded_to")}</p>
          <p className="cert-value">{cert.personFullName}</p>
          <p className="cert-label">{t("certificate.for_completing")}</p>
          <p className="cert-value">{stageName} {t("certificate.stage_of")} {cert.pathName}</p>
          <div className="cert-meta">
            <div className="cert-meta-item">
              <p className="cert-label">{t("certificate.issued_on")}</p>
              <p className="cert-value" style={{ fontSize: 15 }}>{issueDate}</p>
            </div>
            <div className="cert-meta-item">
              <p className="cert-label">{t("certificate.path")}</p>
              <p className="cert-value" style={{ fontSize: 15 }}>{cert.pathName}</p>
            </div>
          </div>
          <p className="cert-ref">{t("certificate.reference")}: {cert.reference}</p>
          <p className="cert-verify">{t("certificate.verify_hint")}</p>
        </div>
      </div>
    </>
  );
}
