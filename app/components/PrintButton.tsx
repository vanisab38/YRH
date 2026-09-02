'use client';

// §4: "export to Excel and PDF." PDF export is the browser's native
// print-to-PDF (Save as PDF in the print dialog) rather than a
// server-rendered PDF — no extra dependency, works everywhere, and the
// print stylesheet (print:hidden on chrome) keeps the saved PDF clean.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:border-zinc-500 print:hidden"
    >
      🖨️ พิมพ์ / บันทึกเป็น PDF
    </button>
  );
}
