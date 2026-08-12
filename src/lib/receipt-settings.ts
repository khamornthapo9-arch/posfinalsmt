import { useCallback, useEffect, useState } from "react";

export interface ReceiptSettings {
  paperWidth: "58" | "80";
  footerNote: string;
  showLogo: boolean;
}

const KEY = "pos-receipt-settings";

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  paperWidth: "80",
  footerNote: "ဝယ်ယူအားပေးမှုကို ကျေးဇူးအထူးတင်ရှိပါသည်။",
  showLogo: true,
};

function read(): ReceiptSettings {
  if (typeof window === "undefined") return DEFAULT_RECEIPT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_RECEIPT_SETTINGS;
    return { ...DEFAULT_RECEIPT_SETTINGS, ...(JSON.parse(raw) as Partial<ReceiptSettings>) };
  } catch {
    return DEFAULT_RECEIPT_SETTINGS;
  }
}

/** Receipt layout preferences kept on the register device. */
export function useReceiptSettings() {
  const [settings, setSettings] = useState<ReceiptSettings>(DEFAULT_RECEIPT_SETTINGS);

  useEffect(() => {
    setSettings(read());
  }, []);

  const update = useCallback((patch: Partial<ReceiptSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, update };
}
