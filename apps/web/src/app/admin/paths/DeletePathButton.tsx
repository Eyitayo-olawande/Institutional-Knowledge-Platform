"use client";

import { t } from "../../../i18n.ts";
import { deletePathAction } from "./actions.ts";

export function DeletePathButton({ pathId, pathName }: { pathId: string; pathName: string }) {
  async function handleDelete(form: FormData) {
    if (!confirm(t("paths.admin.delete_confirm", { name: pathName }))) return;
    await deletePathAction(form);
  }

  return (
    <form action={handleDelete}>
      <input type="hidden" name="pathId" value={pathId} />
      <button
        type="submit"
        className="path-card-delete"
        title={t("paths.admin.delete")}
        aria-label={t("paths.admin.delete")}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
          <path d="M2 3.5h11M5.5 3.5V2.5h4v1M5.5 6.5v4M9.5 6.5v4M3 3.5l.8 9h7.4l.8-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </form>
  );
}
