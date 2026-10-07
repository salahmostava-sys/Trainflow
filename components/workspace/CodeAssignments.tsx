import * as React from "react";

interface AssignedCode {
  code: string;
  category: string;
  used_on?: string | null;
}
interface AssignmentsProps {
  rows: AssignedCode[];
  admin: boolean;
  owned: boolean;
  labels: {
    empty: string;
    all: string;
    code: string;
    category: string;
    usage: string;
    unused: string;
    copy: string;
  };
  copy(code: string): Promise<void>;
}
export function CodeAssignments(props: AssignmentsProps) {
  const [chosen, setChosen] = React.useState<Set<string>>(new Set());
  if (!props.rows.length)
    return <div className="sheet-empty">{props.labels.empty}</div>;
  const available = props.rows.filter((row) => !props.owned || !row.used_on);
  return (
    <table className="sheet-codes-table">
      <thead>
        <tr>
          {props.admin && (
            <th>
              <input
                type="checkbox"
                aria-label={props.labels.all}
                checked={
                  !!available.length &&
                  available.every((row) => chosen.has(row.code))
                }
                onChange={(event) =>
                  setChosen(
                    event.currentTarget.checked
                      ? new Set(available.map((row) => row.code))
                      : new Set(),
                  )
                }
              />
            </th>
          )}
          {[
            props.labels.code,
            props.labels.category,
            props.labels.usage,
            "",
          ].map((heading, index) => (
            <th key={index}>{heading}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.rows.map((row) => (
          <tr key={row.code}>
            {props.admin && (
              <td>
                <input
                  type="checkbox"
                  data-code={row.code}
                  aria-label={row.code}
                  checked={chosen.has(row.code)}
                  disabled={props.owned && !!row.used_on}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setChosen((previous) => {
                      const next = new Set(previous);
                      if (checked) next.add(row.code);
                      else next.delete(row.code);
                      return next;
                    });
                  }}
                />
              </td>
            )}
            <td dir="ltr">{row.code}</td>
            <td>{row.category}</td>
            <td>{row.used_on || props.labels.unused}</td>
            <td>
              <button
                type="button"
                onClick={() => {
                  void props.copy(row.code);
                }}
              >
                {props.labels.copy}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
