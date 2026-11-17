import { listAttestationItems, listItemAttestationDetail } from "@mantle/db/tenant";
import { Card } from "@mantle/ui";
import Link from "next/link";
import { requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";

export default async function AttestationsReport({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const ctx = await requirePermission("library.edit");
  const { db } = ctx;
  const { item: selectedItemId } = await searchParams;

  const items = await listAttestationItems(db);

  const selectedItem = selectedItemId
    ? items.find((i) => i.id === selectedItemId) ?? null
    : null;

  const detail = selectedItem
    ? await listItemAttestationDetail(db, selectedItem.id)
    : null;

  const attested = detail ? detail.filter((r) => r.attested).length : 0;
  const outstanding = detail ? detail.filter((r) => !r.attested).length : 0;

  return (
    <AppShell ctx={ctx} active="admin">
      <PageHead
        title="Attestation Report"
        sub="Track staff read-and-understand attestations for documents that require them."
      />

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left: list of items requiring attestation */}
        <div style={{ flex: "0 0 320px" }}>
          <Card>
            <h2 style={{ marginBottom: 12 }}>Documents</h2>
            {items.length === 0 ? (
              <p className="sub">No documents currently require attestation.</p>
            ) : (
              <ul className="list" style={{ gap: 2 }}>
                {items.map((item) => (
                  <li key={item.id} style={{ display: "block" }}>
                    <Link
                      href={`/admin/attestations?item=${item.id}`}
                      className={`lib-item-related-row${selectedItemId === item.id ? " active" : ""}`}
                      style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px" }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</span>
                      <span className="sub" style={{ fontSize: 12 }}>
                        Version {item.publishedVersion}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right: detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedItem ? (
            <Card>
              <p className="sub">Select a document on the left to view its attestation status.</p>
            </Card>
          ) : (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>{selectedItem.title}</h2>
                  <p className="sub" style={{ fontSize: 13 }}>Version {selectedItem.publishedVersion}</p>
                </div>
                <Link href={`/library/${selectedItem.id}`} className="btn-link" style={{ fontSize: 13 }}>
                  View document
                </Link>
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1, background: "var(--mantle-color-surface_raised)", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--mantle-color-text_success)" }}>{attested}</div>
                  <div style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", marginTop: 2 }}>Attested</div>
                </div>
                <div style={{ flex: 1, background: "var(--mantle-color-surface_raised)", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: outstanding > 0 ? "var(--mantle-color-text_danger)" : "var(--mantle-color-text_muted)" }}>{outstanding}</div>
                  <div style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", marginTop: 2 }}>Outstanding</div>
                </div>
                <div style={{ flex: 1, background: "var(--mantle-color-surface_raised)", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{(detail ?? []).length}</div>
                  <div style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", marginTop: 2 }}>Total active staff</div>
                </div>
              </div>

              {detail && detail.length > 0 ? (
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mantle-color-text_muted)", borderBottom: "1px solid var(--mantle-color-border)" }}>Staff member</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mantle-color-text_muted)", borderBottom: "1px solid var(--mantle-color-border)" }}>Employee ID</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mantle-color-text_muted)", borderBottom: "1px solid var(--mantle-color-border)" }}>Status</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mantle-color-text_muted)", borderBottom: "1px solid var(--mantle-color-border)" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map((row) => (
                      <tr key={row.personId}>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--mantle-color-border_subtle)" }}>{row.fullName}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--mantle-color-border_subtle)", color: "var(--mantle-color-text_muted)" }}>{row.employeeId}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--mantle-color-border_subtle)" }}>
                          {row.attested ? (
                            <span style={{ color: "var(--mantle-color-text_success)", fontWeight: 600 }}>Confirmed</span>
                          ) : (
                            <span style={{ color: "var(--mantle-color-text_danger)" }}>Outstanding</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--mantle-color-border_subtle)", color: "var(--mantle-color-text_muted)" }}>
                          {row.attestedAt
                            ? new Date(row.attestedAt).toISOString().slice(0, 10)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="sub">No active staff found.</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
