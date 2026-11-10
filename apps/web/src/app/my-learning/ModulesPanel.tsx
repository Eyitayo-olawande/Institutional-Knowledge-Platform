"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "../../i18n.ts";

export type FlatModule = {
  id: string;
  title: string;
  completed: boolean;
  unlocked: boolean;
  stageName: string;
  n: number;
  total: number;
  itemId: string | null;
};

type Props = {
  flatModules: FlatModule[];
  tab: string;
  modulesCompleted: number;
  inProgressCount: number;
};

type ViewMode = "list" | "grid";

export function ModulesPanel({ flatModules, tab, modulesCompleted, inProgressCount }: Props) {
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("my_learning_view") as ViewMode | null;
      if (saved === "list" || saved === "grid") setView(saved);
    } catch {}
  }, []);

  function switchView(next: ViewMode) {
    setView(next);
    try { localStorage.setItem("my_learning_view", next); } catch {}
  }

  const visibleModules =
    tab === "in_progress"
      ? flatModules.filter((m) => m.unlocked && !m.completed)
      : tab === "completed"
        ? flatModules.filter((m) => m.completed)
        : flatModules;

  return (
    <div className="my-modules-panel">
      <div className="my-modules-header">
        <nav className="my-tabs" aria-label="Filter modules">
          <Link href="/my-learning" aria-current={tab === "all" ? "true" : undefined} className="my-tab">
            {t("learning.tabs_all")} ({flatModules.length})
          </Link>
          <Link href="/my-learning?tab=in_progress" aria-current={tab === "in_progress" ? "true" : undefined} className="my-tab">
            {t("learning.tabs_in_progress")} ({inProgressCount})
          </Link>
          <Link href="/my-learning?tab=completed" aria-current={tab === "completed" ? "true" : undefined} className="my-tab">
            {t("learning.tabs_completed")} ({modulesCompleted})
          </Link>
        </nav>

        <div className="my-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`my-view-btn${view === "list" ? " active" : ""}`}
            onClick={() => switchView("list")}
            aria-pressed={view === "list"}
            title="List view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="1" y="2.5" width="14" height="2" rx="1" fill="currentColor" />
              <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor" />
              <rect x="1" y="11.5" width="14" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className={`my-view-btn${view === "grid" ? " active" : ""}`}
            onClick={() => switchView("grid")}
            aria-pressed={view === "grid"}
            title="Grid view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {visibleModules.length === 0 ? (
        <p className="sub" style={{ padding: "24px 0", textAlign: "center" }}>
          {t("learning.no_assignments")}
        </p>
      ) : view === "grid" ? (
        <div className="my-module-grid" aria-label="Modules">
          {visibleModules.map((m) => {
            const statusClass = m.completed ? "completed" : m.unlocked ? "in-progress" : "not-started";
            const statusLabel = m.completed
              ? t("home.my_learning.status.completed")
              : m.unlocked
                ? t("home.my_learning.status.in_progress")
                : t("home.my_learning.status.not_started");
            return (
              <div key={m.id} className={`my-module-card ${statusClass}`}>
                <div className="my-module-card-icon" aria-hidden>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="my-module-card-body">
                  <p className="my-module-card-title">{m.title}</p>
                  <p className="my-module-card-meta">
                    {t("learning.module_detail", { n: m.n, total: m.total, stage: m.stageName })}
                  </p>
                </div>
                <span className={`my-module-status ${statusClass}`}>{statusLabel}</span>
                <div className="my-module-card-progress" aria-hidden>
                  <div className="my-module-progress-bar">
                    <div className="my-module-progress-fill" style={{ width: m.completed ? "100%" : "0%" }} />
                  </div>
                </div>
                {m.unlocked ? (
                  m.completed ? (
                    <Link href={m.itemId ? `/library/${m.itemId}` : "/library"} className="my-module-action-btn" style={{ textAlign: "center" }}>
                      {t("learning.action_review")}
                    </Link>
                  ) : (
                    <Link href={m.itemId ? `/library/${m.itemId}?moduleId=${m.id}` : "/library"} className="my-module-action-btn primary" style={{ textAlign: "center" }}>
                      {t("learning.action_start")}
                    </Link>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <ol className="my-module-list" aria-label="Modules">
          {visibleModules.map((m) => {
            const statusClass = m.completed ? "completed" : m.unlocked ? "in-progress" : "not-started";
            const statusLabel = m.completed
              ? t("home.my_learning.status.completed")
              : m.unlocked
                ? t("home.my_learning.status.in_progress")
                : t("home.my_learning.status.not_started");
            return (
              <li key={m.id}>
                <div className="my-module-row">
                  <div
                    style={{
                      width: 72, height: 50, borderRadius: "var(--mantle-radius-sm)",
                      background: "var(--mantle-color-primary_tint)", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      color: "var(--mantle-color-primary)", flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="my-module-body">
                    <div>
                      <p className="my-module-title">{m.title}</p>
                      <p className="my-module-meta">
                        {t("learning.module_detail", { n: m.n, total: m.total, stage: m.stageName })}
                      </p>
                    </div>
                    <span className={`my-module-status ${statusClass}`}>{statusLabel}</span>
                  </div>
                </div>
                <div className="my-module-row-lower">
                  <div className="my-module-progress-bar" aria-hidden>
                    <div className="my-module-progress-fill" style={{ width: m.completed ? "100%" : "0%" }} />
                  </div>
                  {m.unlocked ? (
                    m.completed ? (
                      <Link href={m.itemId ? `/library/${m.itemId}` : "/library"} className="my-module-action-btn">
                        {t("learning.action_review")}
                      </Link>
                    ) : (
                      <Link href={m.itemId ? `/library/${m.itemId}?moduleId=${m.id}` : "/library"} className="my-module-action-btn primary">
                        {t("learning.action_start")}
                      </Link>
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
