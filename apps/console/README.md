# apps/console

Design Streams admin console, on its own domain and used by Design Streams only.

Covers creating, suspending and offboarding tenants; choosing tier, domain and hosting location; assigning and publishing industry templates and regulator packs; plans, invoices and payments for the shared tier; time limited support access grants; health, release version and usage of every instance.

Proposed in the roadmap: a separate Next.js app. Not confirmed until the decision record is approved.

Epic: E13.

Shell in place: a separate Next.js app on port 3001 with one page. Screen text lives in messages/en.json until the translation setup (E1) replaces it.
