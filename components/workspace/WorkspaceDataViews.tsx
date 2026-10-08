import * as React from "react";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6m4-6v6" />
    </svg>
  );
}
export interface CategoryOption {
  value: string;
  label: string;
}
export function SelectOptions({ options }: { options: CategoryOption[] }) {
  return (
    <>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}
export interface VoucherView {
  code: string;
  number: number;
  used: boolean;
  current: boolean;
  background?: string;
  foreground?: string;
  date: string;
  name: string;
  notes: string;
  selected: boolean;
  readOnlyName: boolean;
  labels: {
    select: string;
    copy: string;
    name: string;
    namePlaceholder: string;
    notes: string;
    notesPlaceholder: string;
    unmark: string;
    remove: string;
  };
  copy(): Promise<unknown>;
  select(selected: boolean): void;
  saveName(name: string): Promise<boolean>;
  saveNotes(notes: string): Promise<void>;
  unmark(): Promise<void>;
  remove(): Promise<void>;
}
function VoucherName({ voucher }: { voucher: VoucherView }) {
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const savedName = React.useRef(voucher.name);
  return (
    <div
      className="col-trainee-name"
      onClick={(event) => {
        event.stopPropagation();
        event.currentTarget.querySelector("input")!.focus();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={() => {
        if (!voucher.readOnlyName && !busy) setEditing(true);
      }}
    >
      <input
        type="text"
        maxLength={200}
        dir="auto"
        defaultValue={voucher.name}
        placeholder={voucher.labels.namePlaceholder}
        aria-label={voucher.labels.name}
        disabled={voucher.readOnlyName}
        readOnly={busy || !editing}
        aria-busy={busy}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "F2") {
            event.preventDefault();
            if (!busy) {
              if (editing && event.key === "Enter") event.currentTarget.blur();
              else setEditing(true);
            }
          } else if (event.key === "Escape" && editing) {
            event.currentTarget.value = savedName.current;
            event.currentTarget.blur();
          }
        }}
        onBlur={async (event) => {
          const input = event.currentTarget,
            previous = savedName.current,
            name = input.value.trim();
          setEditing(false);
          if (busy || name === previous) return;
          setBusy(true);
          try {
            if (await voucher.saveName(name)) {
              savedName.current = name;
              input.value = name;
            } else input.value = previous;
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
function VoucherRow({ voucher }: { voucher: VoucherView }) {
  const [selected, setSelected] = React.useState(voucher.selected);
  const color = voucher.foreground;
  return (
    <div
      className={
        "code-row" +
        (voucher.used ? " used" : "") +
        (voucher.current ? " code-current-start" : "")
      }
      data-code={voucher.code}
      style={
        voucher.used ? { background: voucher.background, color } : undefined
      }
      onClick={(event) => {
        if (
          (event.target as Element).closest(
            ".col-check, .col-notes, .col-actions, input, button, select, textarea",
          )
        )
          return;
        void voucher.copy();
      }}
    >
      <div className="col-check" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={voucher.labels.select}
          checked={selected}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            setSelected(event.currentTarget.checked);
            voucher.select(event.currentTarget.checked);
          }}
        />
      </div>
      <div className="col-n" style={{ color }}>
        {voucher.number}
      </div>
      <div
        className="col-code"
        style={
          voucher.used
            ? {
                textDecoration: "line-through",
                textDecorationColor: color,
                color,
              }
            : undefined
        }
      >
        <button
          type="button"
          className="copy-code-btn"
          aria-label={voucher.labels.copy}
          onClick={(event) => {
            event.stopPropagation();
            void voucher.copy();
          }}
        >
          {voucher.code}
        </button>
      </div>
      <div className="col-date" style={{ color }}>
        {voucher.date}
      </div>
      <VoucherName voucher={voucher} />
      <div className="col-notes">
        <input
          type="text"
          defaultValue={voucher.notes}
          placeholder={voucher.labels.notesPlaceholder}
          aria-label={voucher.labels.notes}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onBlur={(event) => {
            if (event.currentTarget.value !== voucher.notes)
              void voucher.saveNotes(event.currentTarget.value);
          }}
        />
      </div>
      <div className="col-actions">
        {voucher.used && (
          <button
            type="button"
            className="icon-btn"
            title={voucher.labels.unmark}
            aria-label={voucher.labels.unmark}
            onClick={(event) => {
              event.stopPropagation();
              void voucher.unmark();
            }}
          >
            ↺
          </button>
        )}
        <button
          type="button"
          className="icon-btn danger"
          title={voucher.labels.remove}
          aria-label={voucher.labels.remove}
          onClick={(event) => {
            event.stopPropagation();
            void voucher.remove();
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
export function VoucherRows({
  rows,
  emptyLabel,
}: {
  rows: VoucherView[];
  emptyLabel: string;
}) {
  if (!rows.length)
    return (
      <div
        className="empty-state"
        style={{ border: "none", boxShadow: "none" }}
      >
        {emptyLabel}
      </div>
    );
  return (
    <>
      {rows.map((voucher) => (
        <VoucherRow key={voucher.code} voucher={voucher} />
      ))}
    </>
  );
}

export interface KeycodeView {
  code: string;
  title: string;
  language: string;
  copyLabel: string;
  categoryLabel: string;
  copy(): Promise<boolean>;
  move(category: string): Promise<void>;
  dragStart(event: React.DragEvent<HTMLDivElement>): void;
  dragEnd(): void;
  dragOver(event: React.DragEvent<HTMLDivElement>): boolean;
  drop(event: React.DragEvent<HTMLDivElement>): Promise<void>;
}
export interface KeycodeGroup {
  category: string;
  title: string;
  linkedLabel: string;
  upLabel: string;
  downLabel: string;
  removeLabel: string;
  first: boolean;
  last: boolean;
  removable: boolean;
  rows: KeycodeView[];
  moveUp(): Promise<void>;
  moveDown(): Promise<void>;
  openCodes(): void;
  remove(): Promise<void>;
}
function KeycodeRow({
  row,
  group,
  options,
}: {
  row: KeycodeView;
  group: KeycodeGroup;
  options: CategoryOption[];
}) {
  const [copied, setCopied] = React.useState(false),
    [dragging, setDragging] = React.useState(false),
    [over, setOver] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    if (await row.copy()) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 900);
    }
  };
  return (
    <div
      className={[
        "kc-row",
        copied && "copied",
        dragging && "dragging",
        over && "drag-over",
      ]
        .filter(Boolean)
        .join(" ")}
      data-keycode={row.code}
      onClick={() => {
        void copy();
      }}
      onDragOver={(event) => {
        if (row.dragOver(event)) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        void row.drop(event);
      }}
    >
      <div
        className="kc-drag-handle"
        draggable
        onDragStart={(event) => {
          if ((event.target as Element).closest("button")) {
            event.preventDefault();
            return;
          }
          setDragging(true);
          row.dragStart(event);
        }}
        onDragEnd={() => {
          setDragging(false);
          setOver(false);
          row.dragEnd();
        }}
      >
        ⋮⋮
      </div>
      <div className="kc-col-title">{row.title}</div>
      <div className="kc-col-lang">{row.language}</div>
      <div className="kc-col-code">
        <button
          type="button"
          className="copy-code-btn"
          aria-label={row.copyLabel}
          onClick={(event) => {
            event.stopPropagation();
            void copy();
          }}
        >
          {row.code}
        </button>
      </div>
      <div className="kc-col-cat">
        <select
          aria-label={row.categoryLabel}
          defaultValue={group.category}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            void row.move(event.currentTarget.value);
          }}
        >
          <SelectOptions options={options} />
        </select>
      </div>
    </div>
  );
}
export function KeycodeGroups({
  groups,
  options,
  headings,
  emptyLabel,
}: {
  groups: KeycodeGroup[];
  options: CategoryOption[];
  headings: string[];
  emptyLabel: string;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.category} className="kc-block">
          <div className="kc-title-row">
            <div className="kc-title">{group.title}</div>
            <div className="kc-title-actions">
              <div className="kc-order-btns">
                <button
                  type="button"
                  className="kc-order-btn"
                  title={group.upLabel}
                  disabled={group.first}
                  onClick={() => {
                    void group.moveUp();
                  }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="kc-order-btn"
                  title={group.downLabel}
                  disabled={group.last}
                  onClick={() => {
                    void group.moveDown();
                  }}
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                className="kc-link"
                onClick={group.openCodes}
              >
                {group.linkedLabel}
              </button>
              {group.removable && (
                <button
                  type="button"
                  className="kc-remove-cat-btn"
                  title={group.removeLabel}
                  aria-label={group.removeLabel}
                  onClick={() => {
                    void group.remove();
                  }}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          </div>
          <div className="kc-scroll">
            <div className="kc-head-row">
              {["drag", "title", "lang", "code", "cat"].map((column, index) => (
                <div key={column} className={"kc-col-" + column}>
                  {headings[index]}
                </div>
              ))}
            </div>
            {group.rows.length ? (
              group.rows.map((row) => (
                <KeycodeRow
                  key={row.code}
                  row={row}
                  group={group}
                  options={options}
                />
              ))
            ) : (
              <div className="kc-empty">{emptyLabel}</div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export interface DailyGroup {
  category: string;
  codes: string[];
}
export function DailyUsed({
  groups,
  totalLabel,
  emptyLabel,
}: {
  groups: DailyGroup[];
  totalLabel?: string;
  emptyLabel?: string;
}) {
  return (
    <>
      {totalLabel && <div className="daily-used-total">{totalLabel}</div>}
      {emptyLabel && <div className="daily-used-none">{emptyLabel}</div>}
      {groups.map((group) => (
        <div key={group.category} className="daily-used-group">
          <strong>
            {group.category}: {group.codes.length}
          </strong>
          <div className="daily-used-codes">
            {group.codes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
export function CategoryTabs({
  options,
  selected,
  choose,
}: {
  options: CategoryOption[];
  selected: string;
  choose(category: string): void;
}) {
  return (
    <>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === selected ? "active" : undefined}
          onClick={() => choose(option.value)}
        >
          {option.label}
        </button>
      ))}
    </>
  );
}
export function CodeStats({
  stats,
}: {
  stats: { label: string; count: number }[];
}) {
  return (
    <>
      {stats.map((stat) => (
        <div key={stat.label} className="stat">
          {stat.label}: <b>{stat.count}</b>
        </div>
      ))}
    </>
  );
}
