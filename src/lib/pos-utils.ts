export const TAX_RATE = 0.05;

/** Myanmar Kyat is the default currency across the app. */
export const DEFAULT_CURRENCY = "Ks";

const ZERO_DECIMAL = new Set(["Ks", "ks", "KS", "K", "ကျပ်", "MMK"]);

export const money = (n: number, symbol = DEFAULT_CURRENCY) => {
  const value = Number.isFinite(n) ? n : 0;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (ZERO_DECIMAL.has(symbol)) {
    return `${sign}${symbol} ${Math.round(abs).toLocaleString("en-US")}`;
  }
  return `${sign}${symbol}${abs.toFixed(2)}`;
};

export type StockStatus = "out" | "low" | "ok";

export function stockStatus(stock: number, threshold: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "ok";
}

export function toCsv(rows: (string | number)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
