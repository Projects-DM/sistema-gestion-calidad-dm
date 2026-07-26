import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, totalRecords, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [20, 50, 100] }) {
  if (totalRecords <= pageSize) return null;
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalRecords);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 bg-gray-50/50">
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span><strong className="text-gray-700">{startRecord}–{endRecord}</strong> de <strong className="text-gray-700">{totalRecords}</strong> registros</span>
        <div className="flex items-center gap-1.5">
          <span>Ver</span>
          <select value={pageSize} onChange={e => { onPageSizeChange(Number(e.target.value)); }}
            className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700">
            {pageSizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Primera página">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1 text-xs text-gray-400">...</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)}
              className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition-colors ${
                p === page ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
              }`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Siguiente">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Última página">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}