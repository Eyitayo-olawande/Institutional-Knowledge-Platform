import { dashboardMetrics } from "@mantle/db/tenant";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requirePermission } from "../../../server/session.ts";
import { AppShell } from "../../_components/AppShell.tsx";
import { Icon } from "../../_components/Icon.tsx";

const CATEGORIES = [
  { key: "knowledge", href: "/admin/reports/knowledge", icon: "library" as const },
  { key: "learning", href: "/admin/reports/learning", icon: "doc" as const },
  { key: "assessment", href: "/admin/reports/assessment", icon: "check" as const },
  { key: "compliance", href: "/admin/reports/compliance", icon: "clipboard" as const },
  { key: "people", href: "/admin/reports/people", icon: "people" as const },
  { key: "intelligence", href: "/admin/reports/intelligence", icon: "chart" as const },
];

type MetricTileProps = {
  value: string | number;
  label: string;
  href: string;
  icon: React.ReactNode;
  accent?: "primary" | "warning" | "danger";
};

function MetricTile({ value, label, href, icon, accent = "primary" }: MetricTileProps) {
  return (
    <Link href={href} className={`report-metric-tile report-metric-tile--link report-metric-tile--${accent}`}>
      <div className="report-metric-tile-top">
        <div className="report-metric-icon">{icon}</div>
        <svg className="report-metric-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
      </div>
      <div className="report-metric-value">{value}</div>
      <div className="report-metric-label">{label}</div>
    </Link>
  );
}

export default async function ReportsDashboard() {
  const ctx = await requirePermission("reports.view");
  const metrics = await dashboardMetrics(ctx.db);

  return (
    <AppShell ctx={ctx} active="reports">
      <div className="admin-hero-wrap">
        <div className="admin-banner">
          <div className="admin-banner-bg" />
          <div className="admin-banner-shade" />
          <div className="admin-banner-copy">
            <h1>
              {t("reports.banner_heading").split(" ")[0]}{" "}
              <span>{t("reports.banner_heading").split(" ").slice(1).join(" ")}</span>
            </h1>
            <p>{t("reports.banner_sub")}</p>
            <div className="admin-banner-rule" />
          </div>
        </div>
      </div>

      <section aria-label="Key metrics" style={{ marginBottom: 32 }}>
        <div className="report-metrics-grid">
          <MetricTile
            value={metrics.activeStaff}
            label={t("reports.metrics.active_staff")}
            href="/admin/reports/people"
            icon={<Icon name="people" size={18} />}
          />
          <MetricTile
            value={metrics.publishedItems}
            label={t("reports.metrics.published_items")}
            href="/admin/reports/knowledge"
            icon={<Icon name="library" size={18} />}
          />
          <MetricTile
            value={metrics.activeAssignments}
            label={t("reports.metrics.active_assignments")}
            href="/admin/reports/learning"
            icon={<Icon name="doc" size={18} />}
          />
          <MetricTile
            value={metrics.completedModules}
            label={t("reports.metrics.completed_modules")}
            href="/admin/reports/learning"
            icon={<Icon name="check" size={18} />}
          />
          <MetricTile
            value={metrics.pendingNominations}
            label={t("reports.metrics.pending_nominations")}
            href="/admin/reports/learning"
            icon={<Icon name="clipboard" size={18} />}
            accent={metrics.pendingNominations > 0 ? "warning" : "primary"}
          />
          <MetricTile
            value={metrics.assessmentAttempts > 0 ? `${metrics.assessmentPassRate}%` : "—"}
            label={t("reports.metrics.assessment_pass_rate")}
            href="/admin/reports/assessment"
            icon={<Icon name="chart" size={18} />}
            accent={metrics.assessmentAttempts > 0 && metrics.assessmentPassRate < 50 ? "danger" : metrics.assessmentAttempts > 0 && metrics.assessmentPassRate < 70 ? "warning" : "primary"}
          />
          <MetricTile
            value={metrics.assessmentAttempts}
            label={t("reports.metrics.assessment_attempts")}
            href="/admin/reports/assessment"
            icon={<Icon name="check" size={18} />}
          />
          <MetricTile
            value={metrics.pendingAcknowledgements}
            label={t("reports.metrics.pending_acknowledgements")}
            href="/admin/reports/compliance"
            icon={<Icon name="clipboard" size={18} />}
            accent={metrics.pendingAcknowledgements > 0 ? "warning" : "primary"}
          />
        </div>
      </section>

      <section aria-label="Report categories">
        <div className="report-category-grid">
          {CATEGORIES.map((cat) => (
            <Link key={cat.key} href={cat.href} className="report-category-card">
              <span className="report-category-icon"><Icon name={cat.icon} size={22} /></span>
              <div>
                <div className="report-category-name">{t(`reports.categories.${cat.key}`)}</div>
                <div className="report-category-sub">{t(`reports.categories.${cat.key}_sub`)}</div>
              </div>
              <span className="report-category-arrow"><Icon name="chevron_down" size={16} /></span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
