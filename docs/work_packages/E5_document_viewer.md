# E5: Document viewer, no raw downloads

* **Status:** Approved 2 November 2026 (conversion runs synchronously on upload, not queued); built
* **Decision record:** [ADR 0021](../adr/0021_document_viewer.md)
* **Depends on:** library files (built, PR #31)
* **Blocks:** E8 paths, whose own spec assumes a module is "completed by opening each of its items"; there is currently nothing to open.

## Goal

A member of staff reads a library item's attached file inside Mantle. Nothing company-owned is downloaded, except a content item that is itself an external link.

## Behaviour

* On upload, a PDF needs no conversion. A DOCX, PPTX or XLSX is converted to PDF immediately, as part of the same upload action, before the file record is written; it ends up marked ready or failed, never left mid-way.
* The item page shows a viewer in place of today's plain file list: a PDF, or a converted document, opens inline using the browser's own PDF viewer; PNG and JPG render inline; MP4 plays inline.
* Only people with `library.edit` see a "Download original" action, to re-edit the source file in its native application. Learners never see a download control, on any file type.
* A content item that is an external link (no uploaded file) opens or embeds that link directly; it carries no conversion step and no download restriction, since it is not company-owned. (No such item type exists yet; this applies once one does.)
* A conversion failure is visible to everyone as a short message in place of the viewer, and to editors specifically as a prompt to remove the file and re-upload it. It does not block the rest of the item, including its text body, from being viewable.
* A file attached before this package shipped, whose type needs conversion but which has no recorded status, is treated as failed rather than sent to the browser as a raw, unreadable file.
* The original file is always kept in storage, never deleted on conversion.

## Data

New columns on the existing file record: conversion status (ready or failed; a third value, pending, exists for if conversion ever moves off the request, but nothing sets it yet), the rendition's storage key, converted-at timestamp. No change to the existing area, classification or published-status checks that already gate who can reach a file at all; this package changes delivery, not access.

## Screens

Library item page: the current "Files" heading and plain link list is replaced by an in-place viewer. Editors additionally see the Download original action; learners see a viewer only, or a short message in its place if the file could not be converted.

## Acceptance criteria

1. A learner opening a published PDF item sees it rendered in the browser; nothing on the page downloads the raw file.
2. A learner opening a published DOCX, PPTX or XLSX item sees the converted PDF rendered the same way as a native PDF, not the original file.
3. A content owner can download the original DOCX, PPTX or XLSX from the item page; a learner signed in as a plain staff member cannot, even by guessing the file's address.
4. A content item that is an external link opens or embeds that link directly, with no conversion step and no "preparing" state.
5. A file that fails to convert still shows the item's text body and a clear message to the editor; it does not break the page for a learner.

## Tests

Unit tests for the conversion job (mocked LibreOffice call) and its status transitions; an integration test that a learner's view route never returns the original bytes for an Office-format file, however it is requested; a permission test that the Download original action is reachable only with `library.edit`.

## Out of scope

Per-viewer watermarking (tracked as an open question on ADR 0021; a candidate for its own later work package); real-time collaborative editing; video transcoding beyond basic playback of an already-compatible MP4.
