import * as React from "react";

export function ExamResultsDialog() {
  return <>
    <div className="sheet-file-header"><h3 id="sheet-exam-title" /><button type="button" id="sheet-exam-close">×</button></div>
    <div className="sheet-exam-connection-row">
      <span id="sheet-exam-connection" role="status" data-connected="false" />
      <a id="sheet-exam-download" href="/workspace/trainflow-prometric.zip" download="trainflow-prometric.zip" hidden />
    </div>
    <div id="sheet-exam-preview" className="sheet-file-preview" />
    <div className="sheet-dialog-footer">
      <button type="button" id="sheet-exam-start" className="sheet-primary" />
      <button type="button" id="sheet-exam-refresh" />
      <button type="button" id="sheet-exam-stop" />
      <button type="button" id="sheet-exam-recover" />
    </div>
    <p id="sheet-exam-status" role="status" hidden />
    <div id="sheet-exam-results" className="sheet-file-preview" hidden />
  </>;
}

export interface ExamResultsTableProps {
  headings: string[];
  labels: {previous: string; next: string; page: string; empty: string};
  rows: {id: string; row: number; name: string; status: string; score: string; exam: string; date: string; dismiss?: {label: string; run(): void}}[];
}
export function ExamResultsTable({headings, rows, labels}: ExamResultsTableProps) {
  const [page,setPage]=React.useState(0),lastPage=Math.max(0,Math.ceil(rows.length/50)-1),currentPage=Math.min(page,lastPage);
  if(!rows.length)return <p>{labels.empty}</p>;
  return <><table className="sheet-exam-table" role="table">
    <thead><tr>{headings.map(heading=><th key={heading} scope="col">{heading}</th>)}</tr></thead>
    <tbody>{rows.slice(currentPage*50,(currentPage+1)*50).map(account=><tr key={account.id} role="row">
      {[String(account.row+1),account.name,account.status,account.score,account.exam,account.date].map((text,index)=><td key={index} data-label={headings[index]} data-empty={!text} role="cell"><span dir={index===3?'ltr':'auto'}>{text}</span></td>)}
      <td data-label={headings[6]} role="cell">{account.dismiss && <button type="button" onClick={account.dismiss.run}>{account.dismiss.label}</button>}</td>
    </tr>)}</tbody>
  </table>{lastPage>0&&<div className="sheet-prometric-pagination">
    <button type="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>{labels.previous}</button>
    <span>{labels.page} {currentPage+1} / {lastPage+1}</span>
    <button type="button" disabled={currentPage===lastPage} onClick={()=>setPage(currentPage+1)}>{labels.next}</button>
  </div>}</>;
}
