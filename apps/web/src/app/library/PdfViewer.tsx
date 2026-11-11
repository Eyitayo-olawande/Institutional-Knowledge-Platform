"use client";

import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

// Worker served from /public so no bundler config needed
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

interface Props {
  fileUrl: string;
  fileName: string;
}

function ChevronLeftSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function MaximizeSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function RotateSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true">
      <path d="M23 4v6h-6" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export function PdfViewer({ fileUrl, fileName }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  // Load PDF
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const task = pdfjsLib.getDocument({ url: fileUrl, withCredentials: true });
    task.promise
      .then((doc) => {
        if (!alive) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        // AbortException is thrown when task.destroy() is called; not a real error.
        if ((err as { name?: string })?.name === "AbortException") return;
        setError("Could not load PDF. The file may not be a valid PDF document.");
        setLoading(false);
      });
    return () => {
      alive = false;
      task.destroy();
    };
  }, [fileUrl]);

  // Render main page canvas
  const renderMainPage = useCallback(
    async (doc: PDFDocumentProxy, pageNum: number, scale: number, rot: number) => {
      if (!mainCanvasRef.current) return;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      let page: PDFPageProxy;
      try {
        page = await doc.getPage(pageNum);
      } catch {
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr, rotation: rot });
      const canvas = mainCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch {
        // cancelled
      }
    },
    [],
  );

  useEffect(() => {
    if (pdf) renderMainPage(pdf, currentPage, zoom, rotation);
  }, [pdf, currentPage, zoom, rotation, renderMainPage]);

  // Render all thumbnails
  useEffect(() => {
    if (!pdf) return;
    for (let i = 1; i <= numPages; i++) {
      const canvas = thumbCanvasRefs.current.get(i);
      if (!canvas) continue;
      (async () => {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.2 });
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
        } catch {
          // ignore
        }
      })();
    }
  }, [pdf, numPages]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = ZOOM_STEPS.find((s) => s > z);
      return next ?? z;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const prev = [...ZOOM_STEPS].reverse().find((s) => s < z);
      return prev ?? z;
    });
  }, []);

  const rotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const goToPage = useCallback((n: number) => {
    setCurrentPage(Math.max(1, Math.min(n, numPages)));
  }, [numPages]);

  if (loading) {
    return (
      <div className="pdf-loading">
        <div className="pdf-loading-spinner" />
        <p>Loading document…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pdf-viewer">
      {/* Left: page thumbnails */}
      <div className="pdf-thumbs">
        <div className="pdf-thumbs-heading">Pages ({numPages})</div>
        <div className="pdf-thumbs-list">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`pdf-thumb-btn${n === currentPage ? " active" : ""}`}
              onClick={() => goToPage(n)}
              aria-label={`Go to page ${n}`}
              aria-current={n === currentPage ? "true" : undefined}
            >
              <canvas
                ref={(el) => {
                  if (el) thumbCanvasRefs.current.set(n, el);
                  else thumbCanvasRefs.current.delete(n);
                }}
                className="pdf-thumb-canvas"
              />
              <span className="pdf-thumb-num">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right: toolbar + main page */}
      <div className="pdf-main">
        {/* Toolbar */}
        <div className="pdf-toolbar">
          <div className="pdf-toolbar-nav">
            <button type="button" className="pdf-toolbar-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page">
              <ChevronLeftSvg />
            </button>
            <span className="pdf-toolbar-page">Page {currentPage} of {numPages}</span>
            <button type="button" className="pdf-toolbar-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages} aria-label="Next page">
              <ChevronRightSvg />
            </button>
          </div>
          <div className="pdf-toolbar-sep" />
          <div className="pdf-toolbar-zoom">
            <button type="button" className="pdf-toolbar-btn" onClick={zoomOut} disabled={zoom <= ZOOM_STEPS[0]!} aria-label="Zoom out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={15} height={15} aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
            </button>
            <span className="pdf-toolbar-zoom-pct">{Math.round(zoom * 100)}%</span>
            <button type="button" className="pdf-toolbar-btn" onClick={zoomIn} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]!} aria-label="Zoom in">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={15} height={15} aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
            </button>
          </div>
          <div className="pdf-toolbar-sep" />
          <div className="pdf-toolbar-icons">
            <button type="button" className="pdf-toolbar-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <MaximizeSvg />
            </button>
            <button type="button" className="pdf-toolbar-btn" onClick={rotate} aria-label="Rotate page">
              <RotateSvg />
            </button>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="pdf-toolbar-btn" aria-label={`Open ${fileName} in new tab`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </a>
          </div>
        </div>

        {/* Page canvas */}
        <div className="pdf-canvas-scroll">
          <canvas ref={mainCanvasRef} className="pdf-canvas" />
        </div>
      </div>
    </div>
  );
}
