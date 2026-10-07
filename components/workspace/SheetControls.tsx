import * as React from "react";

interface ColumnChoice {
  column: number;
  label: string;
  checked: boolean;
  disabled: boolean;
  width?: number;
}
export function ColumnChoices({
  columns,
  showAll,
  toggle,
  showLabel,
  widthLabel,
  autoLabel,
  setWidth,
}: {
  columns: ColumnChoice[];
  showAll(): void;
  toggle(column: number, visible: boolean): void;
  showLabel: string;
  widthLabel: string;
  autoLabel: string;
  setWidth(column: number, width: number | null): void;
}) {
  return (
    <>
      <button type="button" onClick={showAll}>
        {showLabel}
      </button>
      {columns.map((choice) => (
        <div className="sheet-column-choice" key={choice.column}>
          <label>
            <input
              type="checkbox"
              data-column-toggle={choice.column}
              checked={choice.checked}
              disabled={choice.disabled}
              onChange={(event) =>
                toggle(choice.column, event.currentTarget.checked)
              }
            />
            <span>{choice.label}</span>
          </label>
          <input
            key={choice.width ?? "auto"}
            type="number"
            min={40}
            max={800}
            step={1}
            data-column-width={choice.column}
            aria-label={widthLabel + " · " + choice.label}
            placeholder={autoLabel}
            defaultValue={choice.width ?? ""}
            onBlur={(event) => {
              const input = event.currentTarget;
              if (!input.reportValidity()) return;
              const width = input.value === "" ? null : input.valueAsNumber;
              if (width !== (choice.width ?? null)) setWidth(choice.column, width);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        </div>
      ))}
    </>
  );
}
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
