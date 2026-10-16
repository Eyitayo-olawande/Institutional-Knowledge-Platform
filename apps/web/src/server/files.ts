import "server-only";
import { developmentScanner, localFolderStore } from "@mantle/platform/files";

// Development stand ins until the cloud provider and scanner are chosen.
export const fileStore = localFolderStore();
export const scanner = developmentScanner();
