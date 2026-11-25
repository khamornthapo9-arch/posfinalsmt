import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

async function hmacHex(message: string) {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

const branchPassword = (userId: string) => hmacHex(`branch-password:${userId}`);
const pinHash = (branchId: string, pin: string) => hmacHex(`branch-pin:${branchId}:${pin}`);

function assertPin(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN သည် ဂဏန်း ၄ လုံးမှ ၆ လုံး ဖြစ်ရပါမည်");
}

/** Minimal shape of the Supabase query builder used by the helpers below. */
interface OwnedRowQuery<T> {
  select: (columns: string) => {
    eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: T | null }> };
  };
}

interface OwnedStoreRow {
  id: string;
  owner_id: string;
  is_pro: boolean;
  parent_store_id: string | null;
  currency_symbol: string;
  tax_rate: number;
  business_type: string;
}

async function requireOwnedProStore(
  supabase: { from: (t: "stores") => OwnedRowQuery<OwnedStoreRow> },
  userId: string,
  storeId: string,
) {
  const { data } = await supabase
    .from("stores")
    .select("id, owner_id, is_pro, parent_store_id, currency_symbol, tax_rate, business_type")
    .eq("id", storeId)
    .maybeSingle();
  if (!data || data.owner_id !== userId || data.parent_store_id) {
    throw new Error("ပင်မဆိုင် ပိုင်ရှင်သာ ဆိုင်ခွဲ စီမံနိုင်ပါသည်");
  }
  return data as {
    id: string;
    is_pro: boolean;
    currency_symbol: string;
    tax_rate: number;
    business_type: string;
  };
}

export const createBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { storeId: string; name: string; pin: string }) => input)
  .handler(async ({ data, context }) => {
    const name = data.name.trim().slice(0, 80);
    if (!name) throw new Error("ဆိုင်ခွဲ အမည် ထည့်ပါ");
    assertPin(data.pin);
    const parent = await requireOwnedProStore(context.supabase as never, context.userId, data.storeId);
    if (!parent.is_pro) throw new Error("ဆိုင်ခွဲ ဖွင့်ရန် Pro Plan လိုအပ်ပါသည်");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = randomCode();
    const email = `branch-${code.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}@branches.smtpos.app`;

    const { data: created, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { branch: true, branch_name: name },
    });
    if (userErr || !created.user) throw new Error(userErr?.message ?? "Branch account failed");
    const branchUserId = created.user.id;
    await supabaseAdmin.auth.admin.updateUserById(branchUserId, {
      password: await branchPassword(branchUserId),
    });

    const { data: store, error: storeErr } = await supabaseAdmin
      .from("stores")
      .insert({
        name,
        owner_id: context.userId,
        parent_store_id: parent.id,
        is_pro: true,
        currency_symbol: parent.currency_symbol,
        tax_rate: parent.tax_rate,
        business_type: parent.business_type,
      })
      .select("id")
      .single();
    if (storeErr || !store) {
      await supabaseAdmin.auth.admin.deleteUser(branchUserId);
      throw new Error(storeErr?.message ?? "Branch store failed");
    }

    await supabaseAdmin.from("store_members").insert({
      store_id: store.id,
      user_id: branchUserId,
      role: "CASHIER",
      display_name: name,
      is_active: true,
    });

    const { data: branch, error: brErr } = await supabaseAdmin
      .from("branches")
      .insert({
        parent_store_id: parent.id,
        branch_store_id: store.id,
        code,
        name,
        auth_user_id: branchUserId,
      })
      .select("id, code")
      .single();
    if (brErr || !branch) throw new Error(brErr?.message ?? "Branch failed");

    await supabaseAdmin
      .from("branch_secrets")
      .insert({ branch_id: branch.id, pin_hash: await pinHash(branch.id, data.pin) });

    return { id: branch.id, code: branch.code };
  });

async function loadOwnedBranch(supabase: unknown, branchId: string) {
  const { data } = await (
    supabase as {
      from: (t: string) => OwnedRowQuery<{ id: string; auth_user_id: string; branch_store_id: string }>;
    }
  )
    .from("branches")
    .select("id, auth_user_id, branch_store_id")
    .eq("id", branchId)
    .maybeSingle();
  if (!data) throw new Error("ဆိုင်ခွဲ မတွေ့ပါ");
  return data as { id: string; auth_user_id: string; branch_store_id: string };
}

export const resetBranchPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { branchId: string; pin: string }) => input)
  .handler(async ({ data, context }) => {
    assertPin(data.pin);
    const branch = await loadOwnedBranch(context.supabase, data.branchId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("branch_secrets")
      .upsert({
        branch_id: branch.id,
        pin_hash: await pinHash(branch.id, data.pin),
        failed_attempts: 0,
        locked_until: null,
      });
    return { ok: true };
  });

export const setBranchActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { branchId: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    const branch = await loadOwnedBranch(context.supabase, data.branchId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("branches").update({ is_active: data.active }).eq("id", branch.id);
    await supabaseAdmin
      .from("store_members")
      .update({ is_active: data.active })
      .eq("store_id", branch.branch_store_id)
      .eq("user_id", branch.auth_user_id);
    await supabaseAdmin.auth.admin.updateUserById(branch.auth_user_id, {
      ban_duration: data.active ? "none" : "876000h",
    });
    return { ok: true };
  });

/** Public: a branch device signs in with its branch code + PIN. */
export const branchLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; pin: string }) => ({
    code: String(input.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12),
    pin: String(input.pin ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const fail = "ဆိုင်ခွဲ ကုဒ် သို့မဟုတ် PIN မှားနေပါသည်";
    if (!data.code || !/^\d{4,6}$/.test(data.pin)) throw new Error(fail);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: branch } = await supabaseAdmin
      .from("branches")
      .select("id, auth_user_id, is_active")
      .eq("code", data.code)
      .maybeSingle();
    if (!branch) throw new Error(fail);
    if (!branch.is_active) throw new Error("ဤဆိုင်ခွဲကို ပိုင်ရှင်က ပိတ်ထားပါသည်");
    const { data: secret } = await supabaseAdmin
      .from("branch_secrets")
      .select("pin_hash, failed_attempts, locked_until")
      .eq("branch_id", branch.id)
      .maybeSingle();
    if (!secret) throw new Error(fail);
    if (secret.locked_until && new Date(secret.locked_until) > new Date()) {
      throw new Error("PIN မှားလွန်းသဖြင့် ၁၀ မိနစ် ခေတ္တပိတ်ထားပါသည်");
    }
    if ((await pinHash(branch.id, data.pin)) !== secret.pin_hash) {
      const attempts = secret.failed_attempts + 1;
      await supabaseAdmin
        .from("branch_secrets")
        .update({
          failed_attempts: attempts >= 5 ? 0 : attempts,
          locked_until: attempts >= 5 ? new Date(Date.now() + 10 * 60_000).toISOString() : null,
        })
        .eq("branch_id", branch.id);
      throw new Error(fail);
    }
    await supabaseAdmin
      .from("branch_secrets")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("branch_id", branch.id);

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(branch.auth_user_id);
    if (!user.user?.email) throw new Error(fail);
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key },
      body: JSON.stringify({
        email: user.user.email,
        password: await branchPassword(branch.auth_user_id),
      }),
    });
    const json = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!res.ok || !json.access_token || !json.refresh_token) throw new Error(fail);
    return { access_token: json.access_token, refresh_token: json.refresh_token };
  });
