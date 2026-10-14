# packages/platform

Platform services shared by all modules: tenancy, people and organisation, identity and access, permissions, notifications, files, activity log, settings and wording labels, templates and packs, billing, usage tracking. The public API is prepared only and built later.

Joiners, movers and leavers drive everything: a staff import that adds, changes or ends a person triggers the right actions.

Epics: E2, E3, E4, E6, E7, E14.

In place:

* `@mantle/platform/translation`: screen text lookup (ADR 0017).
* `@mantle/platform/tenancy`: tenant resolution by domain and the tenant context that all data access will read from. The control database lookup behind `TenantDirectory` arrives with the control database work package.
