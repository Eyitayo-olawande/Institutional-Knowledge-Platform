import "server-only";
import { databaseUrl, loadConfig } from "@mantle/db";
import { connectControl } from "@mantle/db/control";

// One control database pool per server process, kept across hot reloads.
const globalForControl = globalThis as unknown as { mantleConsoleControl?: ReturnType<typeof connectControl> };

export function control() {
  if (!globalForControl.mantleConsoleControl) {
    const config = loadConfig();
    globalForControl.mantleConsoleControl = connectControl(databaseUrl(config.serverUrl, config.controlDatabase));
  }
  return globalForControl.mantleConsoleControl.db;
}

export function serverUrl(): string {
  return loadConfig().serverUrl;
}

// Design Streams sign in arrives with the identity epic (E3). Until then
// the console only opens in development.
export function consoleOpen(): boolean {
  return process.env.NODE_ENV !== "production";
}
