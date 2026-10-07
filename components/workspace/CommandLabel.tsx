import * as React from "react";
const icons = [
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" stroke="#84929e"></rect>
    <path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#bbc5ce"></path>
    <path d="M3 9h18v5H3z" fill="#ccecff" stroke="#1682bb"></path>
    <path d="M1 12h9m-5-4-4 4 4 4" stroke="#1682bb"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" stroke="#84929e"></rect>
    <path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#bbc5ce"></path>
    <path d="M3 9h18v5H3z" fill="#ccecff" stroke="#1682bb"></path>
    <path d="m14 8 8 8m0-8-8 8" stroke="#db4141"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" stroke="#84929e"></rect>
    <path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#bbc5ce"></path>
    <path d="M3 9h18v5H3z" fill="#ccecff" stroke="#1682bb"></path>
    <path d="M9 1v4m6-4v4M1 9h4M1 14h4" stroke="#1682bb"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" stroke="#84929e"></rect>
    <path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#bbc5ce"></path>
    <path d="M3 9h18v5H3z" fill="#ccecff" stroke="#1682bb"></path>
    <path d="M5 10l2 2-2 2M19 10l-2 2 2 2" stroke="#1682bb"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" stroke="#84929e"></rect>
    <path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#bbc5ce"></path>
    <path d="M3 4h18v16H3z" stroke="#111" strokeDasharray="2 2"></path>
  </svg>,
  <svg
    viewBox="0 0 40 24"
    fill="none"
    stroke="#555"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <text x="2" y="9" stroke="none" fill="#267aa4" fontSize="10">
      {"A"}
    </text>
    <text x="2" y="20" stroke="none" fill="#555" fontSize="10">
      {"Z"}
    </text>
    <path d="M17 3v17m-4-4 4 4 4-4M23 5h15l-6 7v7l-3 2v-9z"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <path d="M3 5h18"></path>
    <path d="M6 8h12M6 12h12M6 16h12" stroke="#929ca7"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <path d="M3 12h18"></path>
    <path d="M6 8h12M6 12h12M6 16h12" stroke="#929ca7"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <path d="M3 19h18"></path>
    <path d="M6 8h12M6 12h12M6 16h12" stroke="#929ca7"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <path d="M3 5h18M3 10h12a4 4 0 0 1 0 8h-4m3-3-3 3 3 3M3 15h4"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" stroke="#84929e"></rect>
    <path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#bbc5ce"></path>
    <path d="M9 4v16M15 4v16" stroke="#1682bb"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <text x="2" y="9" stroke="none" fill="#267aa4" fontSize="10">
      {"A"}
    </text>
    <text x="2" y="20" stroke="none" fill="#555" fontSize="10">
      {"Z"}
    </text>
    <path d="M17 3v17m-4-4 4 4 4-4"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <text x="2" y="9" stroke="none" fill="#267aa4" fontSize="10">
      {"Z"}
    </text>
    <text x="2" y="20" stroke="none" fill="#555" fontSize="10">
      {"A"}
    </text>
    <path d="M17 3v17m-4-4 4 4 4-4"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <path d="M3 4h18l-7 8v7l-4 2v-9z" stroke="#555"></path>
  </svg>,
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" stroke="#84929e"></rect>
    <path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#bbc5ce"></path>
    <path d="M9 4h6v16H9z" fill="#ccecff" stroke="#1682bb"></path>
  </svg>,
];
const commandIcons: Record<string, number> = {
  "sheet-insert-menu-trigger": 0,
  "sheet-delete-menu-trigger": 1,
  "sheet-cell-format-menu-trigger": 2,
  "sheet-merge-center": 3,
  "sheet-border-menu-trigger": 4,
  "sheet-sort-menu-trigger": 5,
  "sheet-valign-top": 6,
  "sheet-valign-middle": 7,
  "sheet-valign-bottom": 8,
  "sheet-wrap-text": 9,
  "sheet-border-menu-all": 4,
  "sheet-border-menu-outline": 4,
  "sheet-border-menu-none": 4,
  "sheet-border-menu-top": 4,
  "sheet-border-menu-bottom": 4,
  "sheet-border-menu-left": 4,
  "sheet-border-menu-right": 4,
  "sheet-border-menu-format": 4,
  "sheet-merge-menu-center": 3,
  "sheet-merge-menu-across": 3,
  "sheet-merge-menu-cells": 3,
  "sheet-merge-menu-unmerge": 10,
  "sheet-merge-menu-selection": 3,
  "sheet-sort-menu-ascending": 11,
  "sheet-sort-menu-descending": 12,
  "sheet-sort-menu-custom": 11,
  "sheet-sort-menu-filter": 13,
  "sheet-sort-menu-clear-filters": 13,
  "sheet-sort-menu-reapply": 13,
  "sheet-sort-menu-clear": 11,
  "sheet-cell-format-menu-row-height": 2,
  "sheet-cell-format-menu-autofit-row": 2,
  "sheet-cell-format-menu-column-width": 14,
  "sheet-cell-format-menu-autofit": 2,
  "sheet-cell-format-menu-default-width": 2,
  "sheet-cell-format-menu-visibility-trigger": 2,
  "sheet-cell-format-menu-hide-rows": 2,
  "sheet-cell-format-menu-show-rows": 2,
  "sheet-cell-format-menu-hide-cols": 14,
  "sheet-cell-format-menu-show-cols": 14,
  "sheet-cell-format-menu-hide-sheet": 2,
  "sheet-cell-format-menu-show-sheet": 2,
  "sheet-cell-format-menu-rename-sheet": 2,
  "sheet-cell-format-menu-move-sheet": 2,
  "sheet-cell-format-menu-tab-color": 2,
  "sheet-insert-cells": 0,
  "sheet-add": 0,
  "sheet-add-col": 14,
  "sheet-insert-sheet": 0,
  "sheet-delete-cells": 1,
  "sheet-delete": 1,
  "sheet-delete-col": 1,
  "sheet-delete-sheet": 1,
};
export function CommandLabel({
  id,
  label,
  menu,
  submenu,
  split,
}: {
  id: string;
  label: string;
  menu: boolean;
  submenu: boolean;
  split: boolean;
}) {
  if (split) return <span aria-hidden="true">▾</span>;
  const icon = icons[commandIcons[id]];
  return (
    <>
      {icon && (
        <span className="sheet-command-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="sheet-command-label">
        {menu ? label.replace(/ ▾$/, "") : label}
      </span>
      {menu && (
        <span className="sheet-command-arrow" aria-hidden="true">
          {submenu ? "›" : "▾"}
        </span>
      )}
    </>
  );
}
