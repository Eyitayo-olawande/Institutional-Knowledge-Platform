export { connectTenant, type TenantDb } from "./client.ts";
export * as tenantSchema from "./schema.ts";
export { addAdministrator, applyStaffImport, changeUserRoles, listPeople, listUsers, setUserRoles, type ImportOptions, type ImportSummary, type StaffRow } from "./people.ts";
export { recentActivity, recordActivity, type ActivityEntry } from "./activity.ts";
export { isWordingKey, setWording, wording, WORDING_DEFAULTS, type Wording, type WordingKey } from "./wording.ts";
export { attachFileToItem, createLibraryItem, fileWithItem, getLibraryItem, itemFiles, itemsDueForReview, listLibraryItems, publishDraft, saveDraft, searchLibrary, type NewItem } from "./library.ts";
export { addNotice, deliveriesFor, markAllRead, noticesFor, recipients, recordDelivery, unreadCount } from "./notices.ts";
export {
  cleanName,
  isStructureKind,
  listStructure,
  mergeStructure,
  moveRoleLevel,
  nameKey,
  renameStructure,
  STRUCTURE_KINDS,
  type MergeResult,
  type RenameResult,
  type StructureEntry,
  type StructureKind,
} from "./structure.ts";
