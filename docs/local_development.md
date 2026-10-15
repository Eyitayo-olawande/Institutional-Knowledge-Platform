# Local development

How to run Mantle on a developer machine. Development uses the fictional test insurer only, never real customer data (Development Roadmap v1, section 11).

## Requirements

* Node 20 or newer (`.nvmrc`). On the product owner's Mac, Node 20 lives in `~/.local/node20` and new Terminal windows pick it up from `~/.bash_profile`.
* Git with access to the GitHub repository.
* PostgreSQL 18 through [Postgres.app](https://postgresapp.com), chosen on 15 October 2026. Open it and keep it running (green "Running" light, port 5432).
* File storage: a local folder (`.data/files`, ignored by git) stands in for S3 compatible storage in development.

## First run

```bash
npm install
npm run db:setup
npm run check
```

`npm run db:setup` creates the control database and two fictional tenant databases (`mantle_control`, `mantle_tenant_alpha`, `mantle_tenant_beta`), applies the control database migrations, and adds the two fictional tenants on `alpha.localhost` and `beta.localhost`. It is safe to run again. `npm run db:migrate` applies new control database migrations only. Defaults are in `.env.example`.

Database integration tests run when `MANTLE_PG_SERVER_URL` is set, for example:

```bash
MANTLE_PG_SERVER_URL=postgres://localhost:5432/postgres npm run test
```

GitHub Actions always runs them against its own PostgreSQL 18.

## Running the apps

| App | Command | Address |
| --- | --- | --- |
| Customer app | `npm run dev -w @mantle/web` | http://alpha.localhost:3000 and http://beta.localhost:3000 (one per fictional tenant) |
| Admin console | `npm run dev -w @mantle/console` | http://localhost:3001 (lists organisations and adds new ones; development only until sign in exists) |
| Worker | `npm run dev -w @mantle/worker` | (no address) |

The customer app works out which organisation you are visiting from the address, so plain http://localhost:3000 shows a hint instead of a tenant.

## Signing in

`npm run db:setup` adds one fictional person to each development tenant: `ada@alpha.test` on alpha.localhost and `ada@beta.test` on beta.localhost. The password is in `packages/platform/src/identity/seed_cli.ts` (development only). Sign in at http://alpha.localhost:3000/sign-in with the password, or ask for an emailed code: until an email provider is chosen, codes are written to `apps/web/.data/outbox.log` (ignored by git).

## Importing staff

Ada on each development tenant is a learning administrator, so after signing in the home page shows "Manage staff" (http://alpha.localhost:3000/admin/people). Upload `docs/samples/staff_import_example.csv` to add four fictional people. Imported people sign in with an emailed code. The file columns are provisional until the SUNU staff file format is agreed.

## Before opening a pull request

Run `npm run check` and `npm run build`. GitHub runs the same checks on every pull request, and nothing merges with failing checks.
