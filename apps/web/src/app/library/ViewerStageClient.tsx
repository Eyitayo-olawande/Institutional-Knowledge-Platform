"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../i18n.ts";
import { PdfViewer } from "./PdfViewer.tsx";

interface Props {
  fileUrl: string | null;
  contentType: string | null;
  fileName: string;
  conversionFailed: boolean;
  itemTitle: string;
  children?: ReactNode; // prose body rendered by the server component
}

function MaximizeSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={15} height={15} aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function MinimizeSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={15} height={15} aria-hidden="true">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

function ExternalLinkSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={14} height={14} aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function ViewerStageClient({ fileUrl, contentType, fileName, conversionFailed, itemTitle, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const showFile = !!fileUrl && !conversionFailed;
  const isPdf = contentType === "application/pdf";
  const isImage = contentType?.startsWith("image/") ?? false;
  const isVideo = contentType === "video/mp4";

  // PDFs get the full PdfViewer (self-contained with thumbnails + toolbar)
  if (isPdf && showFile) {
    return <PdfViewer fileUrl={fileUrl} fileName={fileName} />;
  }

  return (
    <div ref={stageRef} className="lib-item-stage">
      {/* Toolbar for non-PDF files */}
      <div className="lib-item-toolbar">
        <span className="lib-item-toolbar-title">{itemTitle}</span>
        <div className="lib-item-toolbar-actions">
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="lib-item-toolbar-btn">
              <ExternalLinkSvg />
              {t("library.viewer.open_in_tab")}
            </a>
          ) : null}
          <button className="lib-item-toolbar-btn" onClick={toggleFullscreen} type="button" aria-label={isFullscreen ? t("library.viewer.exit_fullscreen") : t("library.viewer.fullscreen")}>
            {isFullscreen ? <MinimizeSvg /> : <MaximizeSvg />}
            {isFullscreen ? t("library.viewer.exit_fullscreen") : t("library.viewer.fullscreen")}
          </button>
        </div>
      </div>

      {/* Stage content */}
      <div className="lib-item-stage-content">
        {showFile ? (
          isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={fileName} />
          ) : isVideo ? (
            <video src={fileUrl} controls />
          ) : (
            <iframe src={fileUrl} title={fileName} />
          )
        ) : conversionFailed ? (
          <div className="lib-item-no-file"><p>{t("library.files.failed")}</p></div>
        ) : (
          children
        )}
      </div>

      {/* Prose body (when file and body both present) */}
      {showFile && children ? children : null}
    </div>
  );
}
