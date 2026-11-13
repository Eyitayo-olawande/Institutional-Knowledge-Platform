import { certificateByReference, certificateSignatory } from "@mantle/db/tenant";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { tenantDb } from "../../../server/session.ts";
import { resolveRequestTenant } from "../../../server/tenant.ts";

function requestHostFrom(h: Awaited<ReturnType<typeof headers>>) {
  return h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
}

export default async function CertificatePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const resolution = await resolveRequestTenant();
  if (!resolution.ok) notFound();
  const db = tenantDb(resolution.tenant);
  const [cert, signatory] = await Promise.all([
    certificateByReference(db, reference),
    certificateSignatory(db),
  ]);
  if (!cert) notFound();

  const h = await headers();
  const host = requestHostFrom(h);
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const certUrl = `${proto}://${host}/certificate/${reference}`;
  const qrDataUrl = await QRCode.toDataURL(certUrl, { width: 120, margin: 1, color: { dark: "#1a1a1a", light: "#ffffff00" } });

  const issueDate = cert.issuedAt.toISOString().slice(0, 10);
  const courseTitle = `${cert.stageKind.charAt(0).toUpperCase()}${cert.stageKind.slice(1)} stage of ${cert.pathName}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #1a1a2e; }
        .cert-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px 32px;
        }
        /* Maintains the template's 3:2 (1536x1024) aspect ratio */
        .cert-wrap {
          position: relative;
          width: 100%;
          max-width: 1100px;
          aspect-ratio: 3 / 2;
          background-image: url('/images/sunu-cert-template.webp');
          background-size: 100% 100%;
          background-repeat: no-repeat;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 8px 48px rgba(0,0,0,0.5);
        }

        /* Recipient name in the blank zone above "For successfully completing" */
        .cert-name {
          position: absolute;
          left: 15%;
          right: 15%;
          top: 45%;
          transform: translateY(-50%);
          text-align: center;
          font-family: 'Great Vibes', cursive;
          font-size: clamp(20px, 5vw, 76px);
          color: #1a1a1a;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Course title sits ABOVE the second red underline (y=61.5%) */
        .cert-course-title {
          position: absolute;
          left: 10%;
          right: 10%;
          top: 57.5%;
          transform: translateY(-50%);
          text-align: center;
          font-family: Inter, system-ui, sans-serif;
          font-weight: 700;
          font-size: clamp(11px, 2.2vw, 32px);
          color: #1a1a1a;
          line-height: 1.25;
        }

        /* Three-column footer values: bottom of text aligns with underscore (y=72.9%) */
        .cert-footer-val {
          position: absolute;
          top: 73%;
          transform: translateY(-100%);
          text-align: center;
          font-family: Inter, system-ui, sans-serif;
          font-weight: 700;
          font-size: clamp(9px, 1.35vw, 20px);
          color: #1a1a1a;
          line-height: 1.2;
        }
        .cert-issued-on { left: 9.7%; width: 22%; }
        .cert-learning-path { left: 35.3%; width: 28%; }
        .cert-cert-ref { left: 66.1%; width: 24%; }

        /* QR code overlaid on the template QR placeholder box (left of verify bar) */
        .cert-qr {
          position: absolute;
          left: 8.5%;
          top: 74%;
          width: 7.5%;
          display: block;
        }

        /* Certificate URL left-aligned with the "Verify this certificate at:" label */
        .cert-url {
          position: absolute;
          left: 18%;
          top: 86%;
          width: 22%;
          font-family: Inter, system-ui, sans-serif;
          font-size: clamp(6px, 0.8vw, 12px);
          color: #c0392b;
          overflow-wrap: break-word;
          word-break: normal;
          line-height: 1.3;
        }

        /* White cover erases the template signature lines from view */
        /* Starts at 63% to clear the COURSE COMPLETION seal (~60% right edge) */
        .cert-sig-cover {
          position: absolute;
          left: 63%;
          top: 82.5%;
          width: 34%;
          height: 9%;
          background: #ffffff;
        }
        /* Signatory: bottom of each text element aligns with its template line */
        /* Lines measured at 83.4%, 86.8%, 89.9% of template height */
        .cert-sig-name {
          position: absolute;
          left: 57%;
          top: 83.5%;
          transform: translateY(-100%);
          width: 28%;
          text-align: center;
          z-index: 1;
          font-family: Inter, system-ui, sans-serif;
          font-weight: 700;
          font-size: clamp(8px, 1.1vw, 17px);
          color: #1a1a1a;
        }
        .cert-sig-title {
          position: absolute;
          left: 57%;
          top: 87%;
          transform: translateY(-100%);
          width: 28%;
          text-align: center;
          z-index: 1;
          font-family: Inter, system-ui, sans-serif;
          font-size: clamp(7px, 0.82vw, 12px);
          color: #444;
        }
        .cert-sig-org {
          position: absolute;
          left: 57%;
          top: 90%;
          transform: translateY(-100%);
          width: 28%;
          text-align: center;
          z-index: 1;
          font-family: Inter, system-ui, sans-serif;
          font-size: clamp(7px, 0.82vw, 12px);
          color: #444;
        }

        .cert-actions {
          margin-top: 20px;
          display: flex;
          gap: 12px;
        }
        .cert-print-btn {
          padding: 10px 28px;
          border-radius: 8px;
          border: none;
          background: #c0392b;
          color: #fff;
          font-family: Inter, system-ui, sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.03em;
        }

        @media print {
          html, body { background: #fff; }
          .cert-page { padding: 0; min-height: unset; background: #fff; justify-content: flex-start; }
          .cert-wrap { max-width: 100%; border-radius: 0; box-shadow: none; }
          .cert-actions { display: none; }
        }
        @media (max-width: 600px) {
          .cert-name { font-size: clamp(14px, 6.5vw, 36px); }
          .cert-course-title { font-size: clamp(9px, 3vw, 18px); }
        }
      `}</style>
      <div className="cert-page">
        <div
          className="cert-wrap"
          role="img"
          aria-label={`Certificate of Completion awarded to ${cert.personFullName} for ${courseTitle}`}
        >
          <div className="cert-name">{cert.personFullName}</div>
          <div className="cert-course-title">{courseTitle}</div>

          <div className="cert-footer-val cert-issued-on">{issueDate}</div>
          <div className="cert-footer-val cert-learning-path">{cert.pathName}</div>
          <div className="cert-footer-val cert-cert-ref">{cert.reference}</div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cert-qr" src={qrDataUrl} alt="" aria-hidden="true" width={120} height={120} />
          <div className="cert-url">{certUrl}</div>

          <div className="cert-sig-cover" aria-hidden="true" />
          <div className="cert-sig-name">{signatory.name}</div>
          <div className="cert-sig-title">{signatory.title}</div>
          {signatory.org && <div className="cert-sig-org">{signatory.org}</div>}
        </div>
        <div className="cert-actions">
          <button
            className="cert-print-btn"
            type="button"
            // eslint-disable-next-line react/no-danger-with-children
          >
            Print
          </button>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('.cert-print-btn')?.addEventListener('click', () => window.print());`,
        }}
      />
    </>
  );
}
