import * as React from "react";
import { SelectOptions, type CategoryOption } from "./WorkspaceDataViews";

export interface MemberView {
  email: string;
  role: string;
  active: boolean;
  self: boolean;
  save(role: string, active: boolean): Promise<void>;
}
function MemberRow({
  member,
  roles,
  statuses,
  saveLabel,
}: {
  member: MemberView;
  roles: CategoryOption[];
  statuses: CategoryOption[];
  saveLabel: string;
}) {
  const [role, setRole] = React.useState(member.role),
    [active, setActive] = React.useState(String(member.active));
  return (
    <div className="ops-list-row">
      <span>{member.email}</span>
      <select
        value={role}
        disabled={member.self}
        aria-label={member.email + " role"}
        onChange={(event) => setRole(event.currentTarget.value)}
      >
        <SelectOptions options={roles} />
      </select>
      <select
        value={active}
        disabled={member.self}
        aria-label={member.email + " status"}
        onChange={(event) => setActive(event.currentTarget.value)}
      >
        <SelectOptions options={statuses} />
      </select>
      <button
        type="button"
        disabled={member.self}
        onClick={() => {
          void member.save(role, active === "true");
        }}
      >
        {saveLabel}
      </button>
    </div>
  );
}
export function MemberList({
  members,
  roles,
  statuses,
  saveLabel,
}: {
  members: MemberView[];
  roles: CategoryOption[];
  statuses: CategoryOption[];
  saveLabel: string;
}) {
  return (
    <>
      {members.map((member) => (
        <MemberRow
          key={member.email}
          member={member}
          roles={roles}
          statuses={statuses}
          saveLabel={saveLabel}
        />
      ))}
    </>
  );
}
export function AuditList({
  entries,
  empty,
}: {
  entries: string[];
  empty: string;
}) {
  if (!entries.length) return <>{empty}</>;
  return (
    <>
      {entries.map((entry, index) => (
        <div key={index} className="ops-list-row">
          {entry}
        </div>
      ))}
    </>
  );
}
export function StockList({
  balances,
}: {
  balances: { category: string; balance: string }[];
}) {
  return (
    <>
      {balances.map((stock) => (
        <div key={stock.category} className="inventory-stock-row">
          <span>{stock.category}</span>
          <strong>{stock.balance}</strong>
        </div>
      ))}
    </>
  );
}

export function InventorySummary({
  date,
  sections,
  overall,
}: {
  date: string;
  sections: { title: string; lines: string[] }[];
  overall: string;
}) {
  return (
    <>
      <p className="inventory-summary-date">{date}</p>
      <div className="inventory-summary-grid">
        {sections.map((section, index) => (
          <section className="inventory-summary-section" key={section.title}>
            <h4>{section.title}</h4>
            {section.lines.map((line, lineIndex) => (
              <p key={lineIndex}><bdi>{line}</bdi></p>
            ))}
            {index === sections.length - 1 && (
              <p className="inventory-summary-overall">{overall}</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
