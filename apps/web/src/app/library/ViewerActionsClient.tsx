"use client";

import { useState } from "react";
import { t } from "../../i18n.ts";

interface Props {
  hasFile: boolean;
}

function HeartSvg({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={15} height={15} aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CheckSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={15} height={15} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MoreSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width={16} height={16} aria-hidden="true">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

export function ViewerActionsClient({ hasFile }: Props) {
  const [favourited, setFavourited] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="viewer-header-actions">
      <button
        type="button"
        className={`viewer-action-btn${favourited ? " active" : ""}`}
        onClick={() => setFavourited((f) => !f)}
        aria-pressed={favourited}
        aria-label={favourited ? t("library.viewer.remove_from_favourites") : t("library.viewer.add_to_favourites")}
      >
        <HeartSvg filled={favourited} />
        {favourited ? t("library.viewer.remove_from_favourites") : t("library.viewer.add_to_favourites")}
      </button>

      {hasFile ? (
        <button
          type="button"
          className={`viewer-action-btn ack${acknowledged ? " done" : ""}`}
          onClick={() => setAcknowledged(true)}
          aria-pressed={acknowledged}
          disabled={acknowledged}
        >
          <CheckSvg />
          {acknowledged ? t("library.viewer.ack_done") : t("library.viewer.ack_button")}
        </button>
      ) : null}

      <button type="button" className="viewer-action-btn icon-only" aria-label={t("library.viewer.more_actions")}>
        <MoreSvg />
      </button>
    </div>
  );
}
