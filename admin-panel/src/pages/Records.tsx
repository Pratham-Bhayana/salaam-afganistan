import { useState } from 'react';
import { Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { mockRecords, type RecordItem } from '../data/mockRecords';
import '../components/DataTable.css';
import './Records.css';

/** One PDF blob URL per record — View and Download share the same file. */
const pdfUrlByRecordId = new Map<string, string>();

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildRecordPdfBlob(row: RecordItem): Blob {
  const lines = [
    `Visa ID: ${row.visaId}`,
    `Applicant: ${row.applicantName}`,
    `Passport: ${row.passportNumber}`,
    `Visa Type: ${row.visaType}`,
    `Issue Date: ${row.issueDate}`,
    `Valid Until: ${row.validUntil}`,
  ];
  const content = [
    'BT',
    '/F1 14 Tf',
    '50 740 Td',
    '18 TL',
    ...lines.flatMap((line, i) =>
      i === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ['T*', `(${escapePdfText(line)}) Tj`]
    ),
    'ET',
  ].join('\n');
  const stream = content;
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources<< /Font<< /F1 4 0 R >> >> >>endobj',
    '4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
    `5 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function getRecordPdfUrl(row: RecordItem): string {
  const cached = pdfUrlByRecordId.get(row._id);
  if (cached) return cached;
  const url = URL.createObjectURL(buildRecordPdfBlob(row));
  pdfUrlByRecordId.set(row._id, url);
  return url;
}

function previewRecordPdf(row: RecordItem) {
  window.open(getRecordPdfUrl(row), '_blank', 'noopener,noreferrer');
}

function downloadRecordPdf(row: RecordItem) {
  const anchor = document.createElement('a');
  anchor.href = getRecordPdfUrl(row);
  anchor.download = `${row.visaId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function Records() {
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('July');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [rows] = useState<RecordItem[]>(mockRecords);

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r._id));
  const totalItems = rows.length;
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const maxPage = Math.max(1, Math.ceil(totalItems / pageSize));

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const allOnPageSelected = rows.every((r) => selectedIds.has(r._id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r._id));
      else rows.forEach((r) => next.add(r._id));
      return next;
    });
  }

  return (
    <div className="applications">
      <PageHeader
        title="Records"
        itemCount={rows.length}
        year={year}
        month={month}
        search={search}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onSearchChange={setSearch}
      />

      <div className="data-table">
        <div className="data-table__scroll">
          <table>
            <thead>
              <tr>
                <th className="data-table__check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </th>
                <th>Visa ID</th>
                <th>Applicant Name</th>
                <th>Passport Number</th>
                <th>Visa Type</th>
                <th>Issue Date</th>
                <th>Valid Until</th>
                <th className="data-table__actions-col records-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const selected = selectedIds.has(row._id);
                return (
                  <tr key={row._id} className={selected ? 'is-selected' : undefined}>
                    <td className="data-table__check">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(row._id)}
                        aria-label={`Select ${row.visaId}`}
                      />
                    </td>
                    <td className="data-table__ref">{row.visaId}</td>
                    <td className="data-table__name">{row.applicantName}</td>
                    <td>{row.passportNumber}</td>
                    <td>{row.visaType}</td>
                    <td>{row.issueDate}</td>
                    <td>{row.validUntil}</td>
                    <td className="data-table__actions-col records-table__actions-col">
                      <div className="records-table__actions">
                        <button
                          type="button"
                          className="data-table__view"
                          aria-label={`View ${row.visaId}`}
                          onClick={() => previewRecordPdf(row)}
                        >
                          <Eye size={18} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="data-table__view"
                          aria-label={`Download ${row.visaId}`}
                          onClick={() => downloadRecordPdf(row)}
                        >
                          <Download size={18} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="data-table__footer">
          <div className="data-table__page-size">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
            >
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="data-table__pager">
            <span>
              {start}-{end} of {totalItems}
            </span>
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= maxPage}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
