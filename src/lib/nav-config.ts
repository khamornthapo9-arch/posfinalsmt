import type { StoreRole } from "@/lib/roles";

/**
 * Single source of truth for application navigation. Only destinations that have a working page
 * are listed; add future modules (Dashboard, Purchasing, Cash & Payments, Staff & Roles) here
 * once their pages exist and they appear in the sidebar, bottom nav and More drawer together.
 */
export interface NavChild {
  to: string;
  label: string;
}

export interface NavItem {
  to: string;
  label: string;
  /** Short label for the mobile bottom bar. */
  short: string;
  tone: string;
  roles: StoreRole[];
  /** Only shown when the store runs in advanced-accounting mode (existing behaviour). */
  advanced?: boolean;
  /** Match the route exactly (so /settings is not "active" on /settings/staff). */
  exact?: boolean;
  /** Reachable on a branch device (existing allow-list). */
  branch?: boolean;
  /** Shown in the five-slot mobile bottom bar, in this order. */
  primary?: number;
  children?: NavChild[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const ALL: StoreRole[] = ["OWNER", "MANAGER", "CASHIER"];
const MGMT: StoreRole[] = ["OWNER", "MANAGER"];
const OWNER: StoreRole[] = ["OWNER"];

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "workspace",
    label: "လုပ်ငန်းခွင်",
    items: [
      {
        to: "/register",
        label: "အရောင်းစာရင်း",
        short: "အရောင်း",
        tone: "sales",
        roles: ALL,
        exact: true,
        branch: true,
        primary: 0,
      },
      {
        to: "/inventory",
        label: "ကုန်ပစ္စည်းများ",
        short: "ကုန်ပစ္စည်း",
        tone: "inventory",
        roles: MGMT,
        branch: true,
        primary: 1,
      },
      {
        to: "/customers",
        label: "ဖောက်သည်များ",
        short: "ဖောက်သည်",
        tone: "customers",
        roles: ALL,
        advanced: true,
        branch: true,
        primary: 2,
      },
      // Purchasing currently lives inside the suppliers page (one module, one entry).
      {
        to: "/suppliers",
        label: "ဝယ်ယူမှုနှင့် ကုန်သွင်းသူများ",
        short: "ကုန်သွင်း",
        tone: "suppliers",
        roles: MGMT,
        advanced: true,
      },
    ],
  },
  {
    id: "finance",
    label: "ငွေကြေး",
    items: [
      {
        to: "/expenses",
        label: "အသုံးစရိတ်",
        short: "အသုံးစရိတ်",
        tone: "expenses",
        roles: MGMT,
        advanced: true,
        branch: true,
      },
      {
        to: "/analytics",
        label: "ဆန်းစစ်ခြင်း",
        short: "ဆန်းစစ်",
        tone: "reports",
        roles: MGMT,
        primary: 3,
      },
    ],
  },
  {
    id: "admin",
    label: "စီမံခန့်ခွဲမှု",
    items: [
      {
        to: "/settings/staff",
        label: "ဆိုင်ခွဲများ",
        short: "ဆိုင်ခွဲ",
        tone: "admin",
        roles: OWNER,
      },
      {
        to: "/settings",
        label: "ပြုပြင်ခြင်း",
        short: "ပြုပြင်",
        tone: "settings",
        roles: OWNER,
        exact: true,
        branch: true,
        children: [{ to: "/settings/receipt", label: "ပြေစာ ဒီဇိုင်း" }],
      },
    ],
  },
];

/** Nested pages that are not menu items themselves, used for breadcrumbs. */
const NESTED: Record<string, { parent: string; label: string }> = {
  "/settings/receipt": { parent: "/settings", label: "ပြေစာ ဒီဇိုင်း" },
  "/settings/staff": { parent: "/settings", label: "ဆိုင်ခွဲများ" },
  "/settings/plan": { parent: "/settings", label: "Plan" },
};

export interface NavContext {
  advanced: boolean;
  isBranchDevice: boolean;
  role: StoreRole;
  isActive: boolean;
}

/**
 * Same visibility rules the sidebar always had: branch devices see only the branch allow-list,
 * everyone else is filtered by role (and must be active). This only hides links; the route guard
 * in PosShell and Supabase RLS remain the enforcement.
 */
export function visibleGroups({
  advanced,
  isBranchDevice,
  role,
  isActive,
}: NavContext): NavGroup[] {
  const show = (item: NavItem) => {
    if (item.advanced && !advanced) return false;
    return isBranchDevice ? Boolean(item.branch) : item.roles.includes(role) && isActive;
  };
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter(show) })).filter(
    (group) => group.items.length > 0,
  );
}

/** Items for the five-slot mobile bar (minus More), in order. */
export function primaryItems(groups: NavGroup[]): NavItem[] {
  return groups
    .flatMap((g) => g.items)
    .filter((i) => i.primary !== undefined)
    .sort((a, b) => (a.primary ?? 0) - (b.primary ?? 0));
}

export function isPathActive(pathname: string, to: string, exact?: boolean): boolean {
  return exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

export interface Crumb {
  label: string;
  to?: string;
}

/** Breadcrumb trail for nested pages; empty for top-level pages. */
export function trailFor(pathname: string): Crumb[] {
  const key = pathname.replace(/\/+$/, "");
  if (key.startsWith("/customers/")) {
    return [{ label: "ဖောက်သည်များ", to: "/customers" }, { label: "ဖောက်သည် အချက်အလက်" }];
  }
  const nested = NESTED[key];
  if (!nested) return [];
  const parent = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.to === nested.parent);
  return [{ label: parent?.label ?? "", to: nested.parent }, { label: nested.label }];
}
