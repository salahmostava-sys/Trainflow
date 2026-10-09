import * as React from "react";

interface SortLevelsProps {
  columns: { value: number; label: string }[];
  initialColumns: number[];
  labels: {
    column: string;
    order: string;
    ascending: string;
    descending: string;
    remove: string;
  };
}
export function SortLevels(props: SortLevelsProps) {
  const [levels, setLevels] = React.useState(
    props.initialColumns.map((column, index) => ({
      id: index,
      column,
      direction: 1,
    })),
  );
  const nextId = React.useRef(levels.length);
  // The existing Apply command reads the form values; React owns level creation/removal.
  React.useLayoutEffect(() => {
    const add = document.getElementById(
      "sheet-sort-add-level",
    ) as HTMLButtonElement;
    add.disabled = levels.length >= 5;
    add.onclick = () =>
      setLevels((previous) =>
        previous.length >= 5
          ? previous
          : [
              ...previous,
              {
                id: nextId.current++,
                column: props.columns[previous.length]?.value ?? 0,
                direction: 1,
              },
            ],
      );
    return () => {
      add.onclick = null;
    };
  }, [levels.length, props.columns]);
  return (
    <>
      {levels.map((level) => (
        <div key={level.id} className="sheet-sort-level">
          <select aria-label={props.labels.column} defaultValue={level.column}>
            {props.columns.map((column) => (
              <option key={column.value} value={column.value}>
                {column.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-excel-ar="حذف المستوى"
            data-excel-en="Remove Level"
            onClick={() =>
              setLevels((previous) =>
                previous.filter((candidate) => candidate.id !== level.id),
              )
            }
          >
            {props.labels.remove}
          </button>
          <select
            aria-label={props.labels.order}
            defaultValue={level.direction}
          >
            <option value={1}>{props.labels.ascending}</option>
            <option value={-1}>{props.labels.descending}</option>
          </select>
        </div>
      ))}
    </>
  );
}
