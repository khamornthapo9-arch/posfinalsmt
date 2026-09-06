# Offline photos, admin-controlled Pro, and announcement banner

## 1. Product photos work offline

Right now a photo is only saved for offline use after it has been shown on screen once.

- When the inventory list or the sales screen loads, quietly download and store every product photo in the current list in the background (a few at a time so it stays fast).
- Photos already stored are skipped.
- Small "photos ready for offline" indicator on the inventory page while it works.

## 2. Admin gateway for Pro plan

- A single master admin account: **khamornthapo9@gmail.com**. Only this account sees the admin area.
- New admin page at `/admin`:
  - List of all shops: shop name, owner email, current plan, sign-up date, and the contact details the shop filled in.
  - Switch each shop between Standard and Pro with one tap.
  - Search by shop name / phone / email.
- Shop owners can no longer switch themselves to Pro. The "trial Pro" toggle on the plan page is removed.

## 3. Contact-the-admin form

On the plan page, instead of the toggle:
- The shop fills in their contact details (phone, Telegram, Viber, email, optional note) and saves them.
- Below that, the admin's own contact details (Telegram, phone, email, KBZ/Wave numbers) are shown so the shop can message directly.
- The saved details appear next to that shop in the admin page, so the admin knows who is asking.

## 4. Marquee announcement

- In the admin page, the admin writes a scrolling message, chooses **all shops** or **specific shops**, and turns it on or off.
- The message scrolls across the top of the app for the chosen shops.
- Shops can dismiss a message for the day; a new message shows again.

## Technical notes

- New table `platform_admins` (user_id) seeded with the master admin's account; a `is_platform_admin()` security-definer function guards policies.
- `stores.is_pro` becomes admin-writable only: tighten the update policy so owners cannot set `is_pro` (owner update policy excludes it via a trigger check; admin policy allows it).
- New table `store_contacts` (store_id, phone, telegram, viber, email, note) — shop owners manage their own row, admin can read all.
- New table `announcements` (message, is_active, audience `ALL`/`SELECTED`, created_at) plus `announcement_targets` (announcement_id, store_id). Admin writes; shops read only the announcements aimed at them.
- `/admin` route gated by `platform_admins` lookup; non-admins are redirected.
- Photo pre-caching: extend `src/lib/use-cached-image.ts` with a `prefetchImages(urls)` helper reusing the existing IndexedDB `cached_images` store, called from `inventory.tsx` and `register.tsx` with a small concurrency limit.
- Marquee component rendered in `src/components/pos/pos-shell.tsx`.
- `settings_.plan.tsx`: remove the Pro toggle, add the contact form and admin contact card.
