export { connectTenant, type TenantDb } from "./client.ts";
export * as tenantSchema from "./schema.ts";
export { addAdministrator, applyStaffImport, changeUserRoles, listPeople, listUsers, setUserRoles, type ImportOptions, type ImportSummary, type StaffRow } from "./people.ts";
export { recentActivity, recordActivity, type ActivityEntry } from "./activity.ts";
export { isWordingKey, setWording, wording, WORDING_DEFAULTS, type Wording, type WordingKey } from "./wording.ts";
export { createLibraryItem, getLibraryItem, listLibraryItems, publishDraft, saveDraft, type NewItem } from "./library.ts";
