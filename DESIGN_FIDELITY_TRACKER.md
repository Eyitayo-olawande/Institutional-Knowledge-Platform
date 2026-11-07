# SUNU eLibrary — Design Fidelity Tracker

> **Repositories**
> - IKP (source of truth): `Institutional-Knowledge-Platform` — `redesign_admin` branch
> - Lovable (visual reference): `sunu-digital-reading-room`
>
> **Legend**
> | Symbol | Meaning |
> |--------|---------|
> | ✅ Complete | Implemented and browser-verified; no open work |
> | 🔧 In Progress | Partially implemented; known gaps remain |
> | ⏳ Pending | No Lovable redesign applied yet |
> | 🚫 N/A | No Lovable equivalent; IKP-only page |

---

## Screen inventory

| Screen | Route | IKP file | Implementation | Visual QA | Functional QA | Notes |
|--------|-------|----------|----------------|-----------|---------------|-------|
| Sign-In | `/sign-in` | `app/sign-in/page.tsx` | ✅ Complete | ✅ Complete | ✅ Complete | Split-panel, SUNU diamond logo, benefits strip, wave background — `4e597f5`, `dcb6ee0`, `d68d45f`, `a1cfbf9`, `be42899` |
| Employee Dashboard | `/` (staff) | `app/page.tsx` | ✅ Complete | ✅ Complete | ✅ Complete | WelcomeBanner with cutout photo + office BG, 4-stage HomeJourney panel, Next Up card, Quick Access icon tiles — `53daa1f`, `9d5f187`, `a1cfbf9` |
| Administrator Dashboard | `/` (admin) | `app/page.tsx` | ✅ Complete | ✅ Complete | ✅ Complete | Hero banner, KPI tiles (Active Users / Learning Paths / Total Resources / Active Assignments), horizontal journey, activity feed — `0d9f8a7`, `c541c05`, `449f630`, `a1cfbf9`, `be42899` |
| Knowledge Library | `/library` | `app/library/page.tsx` | ✅ Complete | ✅ Complete | ✅ Complete | Hero with person banner (shown to all users), topic icon grid, item card grid with type badges, search + filter bar — `7ee20a3`, `449f630`, `be42899` |
| Document Viewer | `/library/[id]` | `app/library/[id]/page.tsx` | ✅ Complete | ✅ Complete | 🔧 In Progress | 2-col layout; prose/image/video confirmed in browser; PDF viewer (PDF.js v5 thumbnails + toolbar) built but awaits a PDF file upload to fully verify — `1ccc297`, `a91ad6b` |
| My Learning | `/my-learning` | `app/my-learning/page.tsx` | ✅ Complete | ✅ Complete | ✅ Complete | Hero banner, horizontal 4-stage journey, module tabs, progress donut, keep-going nudge ("Keep going!" heading + target icon). Demo data seeded and verified for `ada@alpha.test` — `e706e66`, `940eb1c`, `be42899` |
| Notices | `/notices` | `app/notices/page.tsx` | ✅ Complete | ✅ Complete | ✅ Complete | Card-internal header (heading + mark-read action), notice rows with primary-tint bell icon and createdAt date — `6b71d3d` |
| Admin — Learning Paths | `/admin/paths` | `app/admin/paths/page.tsx` | ✅ Complete | ✅ Complete | ✅ Complete | Responsive card grid (graduation-cap icon, name, dept, Open link); 1fr+320px layout — `511f4d8` |
| Admin — People | `/admin/people` | `app/admin/people/page.tsx` | ✅ Complete | ✅ Complete | ✅ Complete | Banner (library_banner.png, "People Management"), content-first layout (staff table 1fr, import aside 320px) — `7cc7004` |
| Admin — Structure | `/admin/structure` | `app/admin/structure/page.tsx` | 🚫 N/A | 🚫 N/A | ✅ Complete | No Lovable equivalent |
| Admin — Areas | `/admin/areas` | `app/admin/areas/page.tsx` | 🚫 N/A | 🚫 N/A | ✅ Complete | No Lovable equivalent |
| Admin — Roles | `/admin/roles` | `app/admin/roles/page.tsx` | 🚫 N/A | 🚫 N/A | ✅ Complete | No Lovable equivalent |
| Admin — Wording | `/admin/wording` | `app/admin/wording/page.tsx` | 🚫 N/A | 🚫 N/A | ✅ Complete | No Lovable equivalent |
| Admin — Activity | `/admin/activity` | `app/admin/activity/page.tsx` | 🚫 N/A | 🚫 N/A | ✅ Complete | No Lovable equivalent |

---

## Asset inventory

| Asset | IKP path | Status | Used by |
|-------|----------|--------|---------|
| `sunu-logo.webp` | `/images/sunu-logo.webp` | ✅ Present | Sidebar, Sign-in |
| `signin-office.jpg` | `/images/signin-office.jpg` | ✅ Present | Sign-in left panel |
| `administrator-office.png` | `/images/administrator-office.png` | ✅ Present | Admin dashboard banner BG |
| `administrator-colleagues.png` | `/images/administrator-colleagues.png` | ✅ Present | Admin dashboard banner cutout |
| `learning-office.png` | `/images/learning-office.png` | ✅ Present | My Learning banner BG |
| `learning-professional.png` | `/images/learning-professional.png` | ✅ Present | Staff home + My Learning banner cutout |
| `library_bg.webp` | `/images/library_bg.webp` | ✅ Present | Library banner BG |
| `library_person.webp` | `/images/library_person.webp` | ✅ Present | Library list banner cutout |
| `library_banner.png` | `/images/library_banner.png` | ✅ Present | Learning Paths admin banner |
| `welcome-banner.jpg` | `/images/welcome-banner.jpg` | ✅ Present | Staff home banner BG (resolved — `53daa1f`) |
| `library-hero.jpg` | `/images/library-hero.jpg` | ✅ Present | Available as alternate BG |
| `my-learning-office.jpg` | `/images/my-learning-office.jpg` | ✅ Present | Available as alternate BG |
| `pdf.worker.min.mjs` | `/public/pdf.worker.min.mjs` | ✅ Present | PDF.js v5 worker for document viewer (`a91ad6b`) |
| `professionals_cutout_v3.png` | — | ✅ Resolved | Previously blocked; `learning-professional.png` used as substitute (`53daa1f`) |

---

## Known design decisions

| Decision | Rationale |
|----------|-----------|
| Sidebar has **no** eLibrary brand section | User explicitly removed the second `.brand.product` block (commit `32c50bd`); Lovable has it but IKP must not |
| `/learning-paths` staff page does not exist | Lovable has this route; IKP does not. Creating it would be new functionality — requires explicit approval |
| Document viewer uses PDF.js (not iframe for PDFs) | Full PDF.js v5 canvas renderer with thumbnails + toolbar implemented in `a91ad6b`; non-PDF files retain iframe/image/video |
| Staff home uses `learning-professional.png` cutout | Originally blocked on `professionals_cutout_v3.png`; resolved with available asset (`53daa1f`) |

---

## Outstanding discrepancies

| Screen | Discrepancy | Priority |
|--------|-------------|----------|
| Document Viewer | PDF viewer not yet tested with an actual uploaded PDF file; thumbnail rendering unconfirmed in live app | High |
| Document Viewer | "Compare" icon in Lovable toolbar reference not implemented | Low |
| All screens | Visual QA complete for all screens (`be42899`); Phases 1–9 done | ✅ Resolved |
| Learning Paths (admin) | Lovable card-based path layout not yet applied | Medium |
| People Management | Full Lovable redesign not yet started | Low |
| Notices | Lovable redesign not yet started | Low |

---

## Phase plan

| Phase | Scope | Status |
|-------|-------|--------|
| 1 — Audit + tracker | Full audit of both repos; asset inventory; this document | ✅ Done |
| 2 — CSS polish: Sign-in + Admin Dashboard | Align CSS to Lovable token-for-token; admin hero + KPI | ✅ Done |
| 3 — Staff home banner | WelcomeBanner with cutout photo + office BG | ✅ Done |
| 4 — Document viewer uplift | 2-col layout, PdfViewer (PDF.js v5 thumbnails + toolbar), page header actions | ✅ Done |
| 5 — My Learning | Page structure + demo data seeded and verified in browser | ✅ Done |
| 6 — Visual QA pass | Formal screenshot comparison for each implemented screen | ✅ Done |
| 7 — Learning Paths admin redesign | Apply Lovable card layout to `/admin/paths` | ✅ Done |
| 8 — People Management redesign | Apply banner + layout to `/admin/people` | ✅ Done |
| 9 — Notices redesign | Apply card-internal header + row design to `/notices` | ✅ Done |

---

*Last updated: 2026-11-07 — Phases 1–9 complete; all implemented screens have Lovable design applied and Visual QA passed*
