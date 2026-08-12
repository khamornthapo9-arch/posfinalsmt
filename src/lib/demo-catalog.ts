export interface DemoItem {
  sku: string;
  name: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_threshold: number;
  category: string;
}

export const DEMO_CATALOG: DemoItem[] = [
  { sku: "BEV-001", name: "Coca-Cola 330ml", price: 1.5, cost_price: 0.9, stock_quantity: 48, min_stock_threshold: 12, category: "အအေးအမျိုးအစား" },
  { sku: "BEV-002", name: "Pepsi 330ml", price: 1.5, cost_price: 0.9, stock_quantity: 36, min_stock_threshold: 12, category: "အအေးအမျိုးအစား" },
  { sku: "BEV-003", name: "Mineral Water 500ml", price: 0.8, cost_price: 0.4, stock_quantity: 100, min_stock_threshold: 20, category: "အအေးအမျိုးအစား" },
  { sku: "BEV-004", name: "Green Tea 500ml", price: 2.0, cost_price: 1.2, stock_quantity: 24, min_stock_threshold: 8, category: "အအေးအမျိုးအစား" },
  { sku: "SNK-001", name: "Potato Chips Original", price: 2.5, cost_price: 1.5, stock_quantity: 30, min_stock_threshold: 10, category: "အစားအစာ" },
  { sku: "SNK-002", name: "Chocolate Bar", price: 1.8, cost_price: 1.0, stock_quantity: 60, min_stock_threshold: 15, category: "အစားအစာ" },
  { sku: "SNK-003", name: "Biscuits Pack", price: 1.2, cost_price: 0.7, stock_quantity: 45, min_stock_threshold: 12, category: "အစားအစာ" },
  { sku: "GRY-001", name: "Instant Noodles", price: 0.9, cost_price: 0.5, stock_quantity: 80, min_stock_threshold: 20, category: "အထွေထွေ" },
  { sku: "GRY-002", name: "Rice 1kg", price: 3.5, cost_price: 2.5, stock_quantity: 25, min_stock_threshold: 8, category: "အထွေထွေ" },
  { sku: "GRY-003", name: "Cooking Oil 1L", price: 4.5, cost_price: 3.0, stock_quantity: 18, min_stock_threshold: 6, category: "အထွေထွေ" },
  { sku: "HHL-001", name: "Toothpaste", price: 3.0, cost_price: 1.8, stock_quantity: 22, min_stock_threshold: 8, category: "အိမ်သုံးပစ္စည်း" },
  { sku: "HHL-002", name: "Shampoo 200ml", price: 5.5, cost_price: 3.5, stock_quantity: 14, min_stock_threshold: 5, category: "အိမ်သုံးပစ္စည်း" },
  { sku: "HHL-003", name: "Soap Bar", price: 1.5, cost_price: 0.9, stock_quantity: 40, min_stock_threshold: 10, category: "အိမ်သုံးပစ္စည်း" },
  { sku: "STN-001", name: "A4 Paper Ream", price: 6.0, cost_price: 4.0, stock_quantity: 12, min_stock_threshold: 5, category: "ရုံးသုံးပစ္စည်း" },
  { sku: "STN-002", name: "Ballpoint Pen", price: 0.5, cost_price: 0.25, stock_quantity: 100, min_stock_threshold: 25, category: "ရုံးသုံးပစ္စည်း" },
];
