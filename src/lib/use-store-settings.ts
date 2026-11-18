import { useAuth } from "@/lib/auth-store";
import { DEFAULT_CURRENCY, money } from "@/lib/pos-utils";
import { usesRestaurantMode } from "@/lib/retail-mode";

/** Currency + tax settings pulled from the active store record. */
export function useStoreSettings() {
  const { store } = useAuth();
  const symbol = store?.currency_symbol || DEFAULT_CURRENCY;
  const taxRate = (store?.tax_rate ?? 5) / 100;
  return {
    store,
    symbol,
    taxRate,
    taxPercent: store?.tax_rate ?? 5,
    isRestaurant: usesRestaurantMode(store?.business_type),
    advanced: Boolean(store?.advanced_accounting_mode),
    isPro: Boolean(store?.is_pro),
    address: store?.address ?? "",
    cashierName: store?.cashier_name ?? "",
    phoneNumbers: store?.phone_numbers ?? [],
    receiptHeader: store?.receipt_header ?? "",
    receiptFooter: store?.receipt_footer ?? "",
    fmt: (n: number) => money(n, symbol),
  };
}