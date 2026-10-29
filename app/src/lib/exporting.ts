// Saving a table for the report: as a CSV file, or printed (and so saved as a PDF by the browser).

export function download(name: string, text: string, type = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface PrintSection {
  heading: string;
  rows: readonly (readonly string[])[];
}

/**
 * Print one or more tables. The page is hidden while printing and the tables take its place,
 * so "Save as PDF" in the print dialog gives a clean document on every browser, phone included.
 */
export function printTables(title: string, sections: readonly PrintSection[]): void {
  const sheet = document.createElement("div");
  sheet.id = "print-sheet";
  sheet.innerHTML =
    `<h1>${escapeHtml(title)}</h1>` +
    sections
      .map(({ heading, rows }) => {
        const [head = [], ...body] = rows;
        const cells = (tag: string, row: readonly string[]) => `<tr>${row.map((c) => `<${tag}>${escapeHtml(c)}</${tag}>`).join("")}</tr>`;
        const table = rows.length > 1 ? `<table><thead>${cells("th", head)}</thead><tbody>${body.map((r) => cells("td", r)).join("")}</tbody></table>` : "<p>Nothing to show yet.</p>";
        return `<h2>${escapeHtml(heading)}</h2>${table}`;
      })
      .join("");
  document.body.append(sheet);
  document.body.classList.add("printing");
  const done = () => {
    document.body.classList.remove("printing");
    sheet.remove();
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}
