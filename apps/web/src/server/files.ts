import "server-only";
import { developmentScanner, localFolderStore } from "@mantle/platform/files";
import { sofficeConverter } from "@mantle/documents/convert";

// Development stand ins until the cloud provider and scanner are chosen.
export const fileStore = localFolderStore();
export const scanner = developmentScanner();
// Converts an uploaded DOCX, PPTX or XLSX to a viewable PDF (ADR 0021).
export const converter = sofficeConverter();
