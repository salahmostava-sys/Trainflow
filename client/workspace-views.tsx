import * as React from "react";
import { ExamResultsDialog, ExamResultsTable } from "../components/workspace/ExamResults";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  TraineeRows,
  TraineeHeaders,
  editGridCell,
  refreshGridCell,
  type GridRowsProps,
  type GridHeadersProps,
  type CellAppearance,
} from "../components/workspace/TraineeGrid";
import {
  VoucherRows,
  KeycodeGroups,
  CategoryTabs,
  CodeStats,
  DailyUsed,
  SelectOptions,
} from "../components/workspace/WorkspaceDataViews";
import { SettingsAddForms } from "../components/workspace/SettingsAddForms";
import {
  MemberList,
  AuditList,
  StockList,
  InventorySummary,
} from "../components/workspace/OperationsViews";
import {
  WorksheetDialog,
  WorksheetTabs,
  CertificateDialog,
  ExcelFileDialog,
  DataPreview,
  CodesExportDialog,
  PrometricDialog,
  RegistrationResults,
  RegistrationPreview,
} from "../components/workspace/SheetFeatureViews";
import { ReportSettings } from "../components/workspace/ReportSettings";
import {
  ReportPanel,
  ReportPreview,
} from "../components/workspace/ReportViews";
import { CommandLabel } from "../components/workspace/CommandLabel";
import {
  ColumnChoices,
  SortLevels,
} from "../components/workspace/SheetControls";
import {
  DetailRecords,
  DuplicateHint,
} from "../components/workspace/TraineeDetails";
import { CodeAssignments } from "../components/workspace/CodeAssignments";
import { ModalIcon } from "../components/workspace/ModalIcon";

const roots = new WeakMap<Element, { root: Root; revision: number }>();
function mountedView(container: Element) {
  let mounted = roots.get(container);
  if (!mounted) {
    mounted = { root: createRoot(container), revision: 0 };
    roots.set(container, mounted);
  }
  return mounted;
}
function renderView(container: Element, view: React.ReactNode) {
  const mounted = mountedView(container);
  // The spreadsheet controller needs the committed DOM for selection and geometry.
  flushSync(() =>
    mounted.root.render(
      <React.Fragment key={++mounted.revision}>{view}</React.Fragment>,
    ),
  );
}

export const WorkspaceViews = {
  inventorySummary(
    container: Element,
    props: React.ComponentProps<typeof InventorySummary>,
  ) {
    renderView(container, <InventorySummary {...props} />);
  },
  message(container: Element, message: string) {
    renderView(container, message);
  },
  detailRecords(
    container: Element,
    props: React.ComponentProps<typeof DetailRecords>,
  ) {
    renderView(container, <DetailRecords {...props} />);
  },
  duplicateHint(
    container: Element,
    props: React.ComponentProps<typeof DuplicateHint>,
  ) {
    renderView(container, <DuplicateHint {...props} />);
  },
  assignments(
    container: Element,
    props: React.ComponentProps<typeof CodeAssignments>,
  ) {
    renderView(container, <CodeAssignments {...props} />);
  },
  commandLabel(
    container: Element,
    props: React.ComponentProps<typeof CommandLabel>,
  ) {
    renderView(container, <CommandLabel {...props} />);
  },
  columnChoices(
    container: Element,
    props: React.ComponentProps<typeof ColumnChoices>,
  ) {
    renderView(container, <ColumnChoices {...props} />);
  },
  sortLevels(
    container: Element,
    props: React.ComponentProps<typeof SortLevels>,
  ) {
    renderView(container, <SortLevels {...props} />);
  },
  clear(container: Element) {
    renderView(container, null);
  },
  reportSettings(
    container: Element,
    props: React.ComponentProps<typeof ReportSettings>,
  ) {
    renderView(container, <ReportSettings {...props} />);
  },
  reportPanel(container: Element) {
    renderView(container, <ReportPanel />);
  },
  reportPreview(
    container: Element,
    props: React.ComponentProps<typeof ReportPreview>,
  ) {
    renderView(container, <ReportPreview {...props} />);
  },
  prometricDialog(
    container: Element,
    props: React.ComponentProps<typeof PrometricDialog>,
  ) {
    renderView(container, <PrometricDialog {...props} />);
  },
  examResultsDialog(container: Element) { renderView(container, <ExamResultsDialog />); },
  examResultsTable(container: Element, props: React.ComponentProps<typeof ExamResultsTable>) {
    const mounted=mountedView(container);
    flushSync(()=>mounted.root.render(<ExamResultsTable key={props.rows[0]?.id||"empty"} {...props} />));
  },
  registrationResults(
    container: Element,
    props: React.ComponentProps<typeof RegistrationResults>,
  ) {
    renderView(container, <RegistrationResults {...props} />);
  },
  registrationPreview(
    container: Element,
    props: React.ComponentProps<typeof RegistrationPreview>,
  ) {
    const mounted = mountedView(container);
    // Status polling must retain the focused account choice and open native menu.
    flushSync(() => mounted.root.render(<RegistrationPreview {...props} />));
  },
  modalIcon(container: Element, props: React.ComponentProps<typeof ModalIcon>) {
    renderView(container, <ModalIcon {...props} />);
  },
  worksheetDialog(container: Element) {
    renderView(container, <WorksheetDialog />);
  },
  worksheetTabs(
    container: Element,
    props: React.ComponentProps<typeof WorksheetTabs>,
  ) {
    renderView(container, <WorksheetTabs {...props} />);
  },
  certificateDialog(
    container: Element,
    props: React.ComponentProps<typeof CertificateDialog>,
  ) {
    renderView(container, <CertificateDialog {...props} />);
  },
  excelDialog(container: Element) {
    renderView(container, <ExcelFileDialog />);
  },
  preview(container: Element, props: React.ComponentProps<typeof DataPreview>) {
    renderView(container, <DataPreview {...props} />);
  },
  codesExportDialog(container: Element) {
    renderView(container, <CodesExportDialog />);
  },
  members(container: Element, props: React.ComponentProps<typeof MemberList>) {
    renderView(container, <MemberList {...props} />);
  },
  audit(container: Element, props: React.ComponentProps<typeof AuditList>) {
    renderView(container, <AuditList {...props} />);
  },
  stock(container: Element, props: React.ComponentProps<typeof StockList>) {
    renderView(container, <StockList {...props} />);
  },
  addForms(
    container: Element,
    props: React.ComponentProps<typeof SettingsAddForms>,
  ) {
    renderView(container, <SettingsAddForms {...props} />);
  },
  vouchers(
    container: Element,
    props: React.ComponentProps<typeof VoucherRows>,
  ) {
    renderView(container, <VoucherRows {...props} />);
  },
  keycodes(
    container: Element,
    props: React.ComponentProps<typeof KeycodeGroups>,
  ) {
    renderView(container, <KeycodeGroups {...props} />);
  },
  categories(
    container: Element,
    props: React.ComponentProps<typeof CategoryTabs>,
  ) {
    renderView(container, <CategoryTabs {...props} />);
  },
  stats(container: Element, props: React.ComponentProps<typeof CodeStats>) {
    renderView(container, <CodeStats {...props} />);
  },
  daily(container: Element, props: React.ComponentProps<typeof DailyUsed>) {
    renderView(container, <DailyUsed {...props} />);
  },
  options(
    container: Element,
    props: React.ComponentProps<typeof SelectOptions>,
  ) {
    renderView(container, <SelectOptions {...props} />);
  },
  rows(container: Element, props: GridRowsProps) {
    renderView(container, <TraineeRows {...props} />);
  },
  headers(container: Element, props: GridHeadersProps) {
    renderView(container, <TraineeHeaders {...props} />);
  },
  editCell(cell: HTMLTableCellElement, text: string) {
    flushSync(() => editGridCell(cell, text));
  },
  refreshCell(cell: HTMLTableCellElement, appearance: CellAppearance) {
    flushSync(() => refreshGridCell(cell, appearance));
  },
};

declare global {
  interface Window {
    WorkspaceViews: typeof WorkspaceViews;
  }
}
