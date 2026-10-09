import * as React from "react";

export interface CellAppearance {
  text: string;
  raw: string;
  style: React.CSSProperties;
  textStyle: React.CSSProperties;
  className: string;
  duplicateLabel?: string;
  resultLabel?: string;
  align?: string;
  onResultChange?: (selected: string, cell: HTMLTableCellElement) => void;
  onResultPointerDown?: (
    event: React.PointerEvent<HTMLSelectElement>,
    cell: HTMLTableCellElement,
  ) => void;
  onResultClick?: (event: React.MouseEvent<HTMLSelectElement>) => void;
  onResultFocus?: (cell: HTMLTableCellElement) => void;
}

export interface GridCell {
  column: number;
  viewRow: number;
  label: string;
  appearance: CellAppearance;
  colSpan?: number;
  rowSpan?: number;
  width?: string;
}
export interface GridRow {
  viewRow: number;
  sourceRow: number;
  height?: number;
  group?: { title: string; countLabel: string };
  cells: (GridCell | { gap: true; count: number; width: number })[];
  onSelect: React.MouseEventHandler<HTMLButtonElement>;
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>;
  resizeTitle: string;
  onResize: React.PointerEventHandler<HTMLDivElement>;
  onResetHeight: React.MouseEventHandler<HTMLDivElement>;
}

type CellControl = {
  edit(text: string): void;
  refresh(appearance: CellAppearance): void;
};
const controls = new WeakMap<HTMLTableCellElement, CellControl>();
function openResultPicker(select: HTMLSelectElement) {
  try {
    select.showPicker?.();
  } catch (error) {
    // Browsers can decline an explicit picker; the native select stays usable.
    if (
      !(error instanceof DOMException) ||
      !["NotAllowedError", "NotSupportedError", "InvalidStateError"].includes(
        error.name,
      )
    )
      throw error;
  }
}
export function editGridCell(cell: HTMLTableCellElement, text: string) {
  controls.get(cell)!.edit(text);
}
export function refreshGridCell(
  cell: HTMLTableCellElement,
  appearance: CellAppearance,
) {
  controls.get(cell)!.refresh(appearance);
}

function TraineeCell({
  column,
  viewRow,
  label,
  appearance,
  colSpan,
  rowSpan,
  width,
}: GridCell) {
  const cell = React.useRef<HTMLTableCellElement>(null);
  const [contents, setContents] = React.useState<{
    appearance: CellAppearance;
    editing?: string;
  }>({ appearance });
  React.useLayoutEffect(() => {
    const element = cell.current!;
    controls.set(element, {
      edit: (text) =>
        setContents((previous) => ({
          appearance: previous.appearance,
          editing: text,
        })),
      refresh: (next) => setContents({ appearance: next }),
    });
    return () => {
      controls.delete(element);
    };
  }, []);
  const shown = contents.appearance;
  const merged = Boolean(colSpan || rowSpan);
  const style = {
    ...shown.style,
    ...(shown.style.height
      ? { "--custom-cell-height": shown.style.height }
      : {}),
    ...(width ? { "--col-w": width } : {}),
  } as React.CSSProperties;
  return (
    <td
      ref={cell}
      data-v={viewRow}
      data-col={column}
      data-cell-height={shown.style.height ? "" : undefined}
      tabIndex={-1}
      role="gridcell"
      dir="auto"
      aria-label={label}
      aria-haspopup={shown.duplicateLabel ? "dialog" : undefined}
      data-formula={
        shown.raw.startsWith("=") && column !== 11 ? shown.raw : undefined
      }
      title={shown.raw.startsWith("=") && column !== 11 ? shown.raw : undefined}
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={style}
      className={[shown.className, merged ? "sheet-merged" : ""]
        .filter(Boolean)
        .join(" ")}
      suppressContentEditableWarning
      onClick={(event) => {
        if (
          column === 11 &&
          contents.editing === undefined &&
          !event.defaultPrevented
        )
          openResultPicker(cell.current!.querySelector("select")!);
      }}
    >
      {contents.editing !== undefined ? (
        contents.editing
      ) : column === 11 ? (
        <select
          aria-label={shown.resultLabel}
          className="sheet-result-select"
          dir="rtl"
          value={shown.raw}
          style={{
            textAlign: shown.align as React.CSSProperties["textAlign"],
            textAlignLast: shown.align as React.CSSProperties["textAlignLast"],
          }}
          onChange={(event) =>
            shown.onResultChange!(event.currentTarget.value, cell.current!)
          }
          onPointerDown={(event) =>
            shown.onResultPointerDown!(event, cell.current!)
          }
          onClick={shown.onResultClick}
          onFocus={() => shown.onResultFocus!(cell.current!)}
        >
          {[
            "",
            "ناجح",
            "راسب",
            "لم يدخل",
            ...(!["", "ناجح", "راسب", "لم يدخل"].includes(shown.raw)
              ? [shown.raw]
              : []),
          ].map((option) => (
            <option key={option} value={option}>
              {option || "—"}
            </option>
          ))}
        </select>
      ) : (
        <>
          <span
            className={
              shown.textStyle.width
                ? "sheet-cell-value sheet-center-across"
                : "sheet-cell-value"
            }
            style={shown.textStyle}
          >
            {shown.text}
          </span>
          {shown.duplicateLabel && (
            <span className="sheet-duplicate-badge">
              {shown.duplicateLabel}
            </span>
          )}
        </>
      )}
    </td>
  );
}

export interface GridRowsProps {
  rows: GridRow[];
  columnCount: number;
  top: number;
  bottom: number;
  empty?: { icon: string; message: string; clearLabel?: string; clear(): void };
}
function Spacer({
  height,
  columns,
  edge,
}: {
  height: number;
  columns: number;
  edge: string;
}) {
  return (
    <tr
      className="sheet-spacer"
      aria-hidden="true"
      data-edge={edge}
      style={{ height }}
    >
      <td colSpan={columns} style={{ height }} />
    </tr>
  );
}
export function TraineeRows({
  rows,
  columnCount,
  top,
  bottom,
  empty,
}: GridRowsProps) {
  if (empty)
    return (
      <tr className="sheet-empty-view-row">
        <td className="sheet-empty-view-cell" colSpan={columnCount}>
          <div className="sheet-empty-view-content">
            <div className="sheet-empty-view-icon">{empty.icon}</div>
            <strong>{empty.message}</strong>
            {empty.clearLabel && (
              <button
                type="button"
                className="sheet-empty-view-btn"
                onClick={empty.clear}
              >
                {empty.clearLabel}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  return (
    <>
      {top > 0 && <Spacer height={top} columns={columnCount} edge="top" />}
      {rows.map((row) => (
        <React.Fragment key={row.viewRow}>
          {row.group && (
            <tr className="sheet-day-separator">
              <th colSpan={columnCount} scope="rowgroup">
                <div className="sheet-day-label">
                  <span className="sheet-day-title" dir="auto" title={row.group.title}>
                    {row.group.title}
                  </span>
                  <span className="sheet-day-count" dir="auto">
                    {row.group.countLabel}
                  </span>
                </div>
              </th>
            </tr>
          )}
          <tr
            aria-rowindex={row.viewRow + 2}
            data-row-height={row.height ? "" : undefined}
            style={
              row.height
                ? ({
                    "--custom-row-height": row.height + "px",
                  } as React.CSSProperties)
                : undefined
            }
          >
            <th className="sheet-rownum" scope="row" data-rowv={row.viewRow}>
              <button
                type="button"
                onClick={row.onSelect}
                onPointerDown={row.onPointerDown}
              >
                {row.sourceRow + 1}
              </button>
              <div
                className="sheet-row-resizer"
                data-resizer-row={row.viewRow}
                title={row.resizeTitle}
                onPointerDown={row.onResize}
                onDoubleClick={row.onResetHeight}
              />
            </th>
            {row.cells.map((cell, index) =>
              "gap" in cell ? (
                <td
                  key={"gap-" + index}
                  className="sheet-column-spacer"
                  colSpan={cell.count}
                  aria-hidden="true"
                  style={
                    { "--gap-width": cell.width + "px" } as React.CSSProperties
                  }
                />
              ) : (
                <TraineeCell key={cell.column} {...cell} />
              ),
            )}
          </tr>
        </React.Fragment>
      ))}
      {bottom > 0 && (
        <Spacer height={bottom} columns={columnCount} edge="bottom" />
      )}
    </>
  );
}

export interface GridHeader {
  column: number;
  label: string;
  title: string;
  width?: string;
  onSelect: React.MouseEventHandler<HTMLButtonElement>;
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>;
  onRename: React.MouseEventHandler<HTMLTableCellElement>;
  onResize: (
    event: React.PointerEvent<HTMLDivElement>,
    header: HTMLTableCellElement,
  ) => void;
  onResetWidth: React.MouseEventHandler<HTMLDivElement>;
}
export interface GridHeadersProps {
  columns: GridHeader[];
  selectLabel: string;
  selectTitle: string;
  resizeTitle: string;
  onSelectAll: React.MouseEventHandler<HTMLButtonElement>;
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>;
}
export function TraineeHeaders(props: GridHeadersProps) {
  return (
    <tr>
      <th
        className="sheet-rownum sheet-corner-cell"
        scope="col"
        onClick={(event) => {
          const button = event.currentTarget.querySelector("button")!;
          if (!button.contains(event.target as Node)) button.click();
        }}
      >
        <button
          id="sheet-select-all-corner"
          type="button"
          className="sheet-select-all-btn"
          title={props.selectTitle}
          aria-label={props.selectLabel}
          onClick={props.onSelectAll}
          onPointerDown={props.onPointerDown}
        >
          <span className="sheet-corner-hash">#</span>
          <span className="sheet-corner-triangle">◢</span>
        </button>
      </th>
      {props.columns.map((column) => (
        <th
          key={column.column}
          scope="col"
          data-col={column.column}
          title={column.title}
          style={
            column.width
              ? ({ "--col-w": column.width } as React.CSSProperties)
              : undefined
          }
          onDoubleClick={column.onRename}
        >
          <button
            type="button"
            onClick={column.onSelect}
            onPointerDown={column.onPointerDown}
          >
            {column.label}
          </button>
          <div
            className="sheet-col-resizer"
            data-resizer-col={column.column}
            title={props.resizeTitle}
            onPointerDown={(event) =>
              column.onResize(
                event,
                event.currentTarget.parentElement as HTMLTableCellElement,
              )
            }
            onDoubleClick={column.onResetWidth}
          />
        </th>
      ))}
    </tr>
  );
}
