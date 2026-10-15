import pg from "pg";
import { databaseUrl, type DatabaseConfig } from "./config.ts";

const SAFE_NAME = /^[a-z][a-z0-9_]{0,62}$/;

function assertSafeName(name: string): void {
  if (!SAFE_NAME.test(name)) throw new Error(`Unsafe database name: ${name}`);
}

export async function databaseExists(client: pg.Client, name: string): Promise<boolean> {
  const result = await client.query("select 1 from pg_database where datname = $1", [name]);
  return result.rowCount === 1;
}

// Creates the control database and the development tenant databases if
// they are missing. Safe to run again; existing databases are left alone.
export async function setupDatabases(config: DatabaseConfig): Promise<{ created: string[]; existing: string[] }> {
  const names = [config.controlDatabase, ...config.devTenantDatabases];
  names.forEach(assertSafeName);
  const client = new pg.Client({ connectionString: config.serverUrl });
  await client.connect();
  const created: string[] = [];
  const existing: string[] = [];
  try {
    for (const name of names) {
      if (await databaseExists(client, name)) {
        existing.push(name);
      } else {
        await client.query(`create database ${name}`);
        created.push(name);
      }
    }
  } finally {
    await client.end();
  }
  return { created, existing };
}

export async function canConnect(serverUrl: string, database: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: databaseUrl(serverUrl, database) });
  try {
    await client.connect();
    await client.query("select 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}
