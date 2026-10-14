# Local development

How to run Mantle on a developer machine. Development uses the fictional test insurer only, never real customer data (Development Roadmap v1, section 11).

## Requirements

* Node 20 or newer (`.nvmrc`). On the product owner's Mac, Node 20 lives in `~/.local/node20` and new Terminal windows pick it up from `~/.bash_profile`.
* Git with access to the GitHub repository.
* PostgreSQL: **not chosen yet.** Needed once the control database work package starts. Options under consideration: Postgres.app or Docker Desktop.

## First run

```bash
npm install
npm run check
```

## Running the apps

| App | Command | Address |
| --- | --- | --- |
| Customer app | `npm run dev -w @mantle/web` | http://localhost:3000 |
| Admin console | `npm run dev -w @mantle/console` | http://localhost:3001 |
| Worker | `npm run dev -w @mantle/worker` | (no address) |

## Before opening a pull request

Run `npm run check` and `npm run build`. GitHub runs the same checks on every pull request, and nothing merges with failing checks.
