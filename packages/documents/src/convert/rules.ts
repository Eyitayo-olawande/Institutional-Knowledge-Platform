// Which uploaded files need converting to PDF before they can be viewed
// (ADR 0021). A PDF, PNG, JPG or MP4 is viewed from the original and needs
// no entry here.
export const CONVERTIBLE_EXTENSIONS: Readonly<Record<string, string>> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

export function needsConversion(contentType: string): boolean {
  return Object.hasOwn(CONVERTIBLE_EXTENSIONS, contentType);
}
