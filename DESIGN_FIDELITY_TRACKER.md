# SUNU eLibrary — Design Fidelity Tracker

> **Repositories**
> - IKP (source of truth): `Institutional-Knowledge-Platform` — `redesign_admin` branch
> - Lovable (visual reference): `sunu-digital-reading-room`
>
> **Legend**
> | Symbol | Meaning |
> |--------|---------|
> | ✅ Complete | Matches Lovable closely; no open work |
> | 🔧 In Progress | Currently being implemented |
> | ⚠️ Gap | Known gap, implementation planned |
> | ❌ Blocked | Cannot proceed — missing asset or decision needed |
> | 🚫 N/A | No Lovable equivalent; IKP-only page |

---

## Screen inventory

| Screen | Route | IKP file | Lovable component | Status | Notes |
|--------|-------|----------|-------------------|--------|-------|
| Sign-In | `/sign-in` | `app/sign-in/page.tsx` | `SignInView.tsx` | ⚠️ Gap | Split layout exists; minor CSS deltas vs Lovable spec |
| Employee Dashboard | `/` (staff) | `app/page.tsx` | `DashboardWidgets.tsx` | ❌ Blocked | Banner needs `professionals_cutout_v3.png` + `office_background.jpg` (MISSING) |
| Admin Dashboard | `/` (admin) | `app/page.tsx` | `AdminDashboardView.tsx` | ⚠️ Gap | All components present; needs visual QA and CSS polish |
| Knowledge Library | `/library` | `app/library/page.tsx` | — | ✅ Complete | Topic grid, type tabs, resource cards, filter sidebar all present |
| Library Item / Viewer | `/library/[id]` | `app/library/[id]/page.tsx` | `DocumentViewer.tsx` | ⚠️ Gap | 3-panel viewer design not implemented; uses iframe + card today |
| My Learning | `/my-learning` | `app/my-learning/page.tsx` | `MyLearningView.tsx` | ⚠️ Gap | All structural components present; needs visual QA vs Lovable |
| Notices | `/notices` | `app/notices/page.tsx` | — | 🚫 N/A | No Lovable equivalent |
| Admin — Learning Paths | `/admin/paths` | `app/admin/paths/page.tsx` | `LearningPathsView.tsx` | ⚠️ Gap | Staff-facing `/learning-paths` from Lovable does not exist in IKP (paths are admin-only); admin page needs banner polish |
| Admin — People | `/admin/people` | `app/admin/people/page.tsx` | — | 🚫 N/A | No Lovable equivalent |
| Admin — Structure | `/admin/structure` | `app/admin/structure/page.tsx` | — | 🚫 N/A | No Lovable equivalent |
| Admin — Areas | `/admin/areas` | `app/admin/areas/page.tsx` | — | 🚫 N/A | No Lovable equivalent |
| Admin — Roles | `/admin/roles` | `app/admin/roles/page.tsx` | — | 🚫 N/A | No Lovable equivalent |
| Admin — Wording | `/admin/wording` | `app/admin/wording/page.tsx` | — | 🚫 N/A | No Lovable equivalent |
| Admin — Activity | `/admin/activity` | `app/admin/activity/page.tsx` | — | 🚫 N/A | No Lovable equivalent |

---

## Asset inventory

| Asset | IKP path | Status | Used by |
|-------|----------|--------|---------|
| `sunu-logo.webp` | `/images/sunu-logo.webp` | ✅ Present | Sidebar, Sign-in |
| `signin-office.jpg` | `/images/signin-office.jpg` | ✅ Present | Sign-in left panel |
| `administrator-office.png` | `/images/administrator-office.png` | ✅ Present | Admin dashboard banner BG |
| `administrator-colleagues.png` | `/images/administrator-colleagues.png` | ✅ Present | Admin dashboard banner cutout |
| `learning-office.png` | `/images/learning-office.png` | ✅ Present | My Learning banner BG |
| `learning-professional.png` | `/images/learning-professional.png` | ✅ Present | My Learning banner cutout |
| `library_bg.webp` | `/images/library_bg.webp` | ✅ Present | Library banner BG (staff home uses this as fallback) |
| `library_person.webp` | `/images/library_person.webp` | ✅ Present | Library list banner cutout (single woman) |
| `library_banner.png` | `/images/library_banner.png` | ✅ Present | Learning Paths admin banner |
| `welcome-banner.jpg` | `/images/welcome-banner.jpg` | ✅ Present | Paths admin banner (alternate) |
| `library-hero.jpg` | `/images/library-hero.jpg` | ✅ Present | Available as alternate BG |
| `my-learning-office.jpg` | `/images/my-learning-office.jpg` | ✅ Present | Available as alternate BG |
| `professionals_cutout_v3.png` | — | ❌ MISSING | Staff home banner cutout (two colleagues; Lovable: `professionals_cutout_v3.png` 1.5 MB) |
| `office_background.jpg` | — | ❌ MISSING | Staff home banner BG (Lovable: `office_background.jpg` 63 KB) |

---

## Known design decisions

| Decision | Rationale |
|----------|-----------|
| Sidebar has **no** eLibrary brand section | User explicitly removed the second `.brand.product` block (commit `32c50bd`); Lovable has it but IKP must not |
| `/learning-paths` staff page does not exist | Lovable has this route; IKP does not. Creating it would be new functionality — requires explicit approval |
| Document viewer uses iframe | Lovable `DocumentViewer.tsx` has a 3-panel layout with JS-driven pagination, zoom, rotate; implementing the full viewer is significant new functionality — requires explicit approval |

---

## Phase plan

| Phase | Scope | Status |
|-------|-------|--------|
| 1 — Audit + tracker | Full audit of both repos; asset inventory; this document | ✅ Done |
| 2 — CSS polish: Sign-in + Admin Dashboard | Align CSS to Lovable token-for-token; sign-in minor delta; admin hero + KPI spot-check | ⚠️ Pending |
| 3 — Staff home banner | Fix banner bg + cutout — **BLOCKED on `professionals_cutout_v3.png` + `office_background.jpg`** | ❌ Blocked |
| 4 — Library item page uplift | Improve visual design of `/library/[id]` within the existing iframe-based approach | ⚠️ Pending |
| 5 — My Learning visual QA | Screenshot + compare; fix any CSS gaps | ⚠️ Pending |
| 6 — TypeScript check + commit | Clean `tsc --noEmit` before every commit | ⚠️ Pending |
| 7 — Push + PR update | Push `redesign_admin` with accumulated commits | ⚠️ Pending |

---

*Last updated: 2026-11-06 — Phase 1 complete*
