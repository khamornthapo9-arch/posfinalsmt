import { useAuth } from "@/lib/auth-store";
import { money } from "@/lib/pos-utils";

/** Currency + tax settings pulled from the active store record. */
export function useStoreSettings() {
  const { store } = useAuth();
  const symbol = store?.currency_symbol || "$";
  const taxRate = (store?.tax_rate ?? 5) / 100;
  return {
    store,
    symbol,
    taxRate,
    taxPercent: store?.tax_rate ?? 5,
    isRestaurant: store?.business_type === "RESTAURANT",
    advanced: Boolean(store?.advanced_accounting_mode),
    address: store?.address ?? "",
    cashierName: store?.cashier_name ?? "",
    phoneNumbers: store?.phone_numbers ?? [],
    receiptHeader: store?.receipt_header ?? "",
    receiptFooter: store?.receipt_footer ?? "",
    fmt: (n: number) => money(n, symbol),
  };
}