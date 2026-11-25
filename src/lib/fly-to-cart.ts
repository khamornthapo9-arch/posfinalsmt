/**
 * "Add to cart" flight: a copy of the tapped product's photo (or a brand-coloured dot when it
 * has none) arcs from where the cashier tapped into the cart, then the cart target bumps.
 *
 * Targets are any element marked `data-cart-target`: the item-count badge in the cart panel
 * on tablet/PC, and the cart icon in the checkout bar on phones. Only a *visible* target is
 * used, so the hidden copy (e.g. the checkout drawer while closed) is ignored.
 *
 * Pure DOM + Web Animations API: no state, no re-renders, nothing to clean up on unmount.
 */

const MAX_IN_FLIGHT = 8;
let inFlight = 0;

function findVisibleTarget(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>("[data-cart-target]");
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue; // display:none (other layout)
    if (getComputedStyle(el).visibility === "hidden") continue; // closed drawer
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue; // scrolled off-screen
    return el;
  }
  return null;
}

export function flyToCart(source: Element, options: { imageSrc?: string | null } = {}): void {
  if (typeof document === "undefined" || typeof source.animate !== "function") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (inFlight >= MAX_IN_FLIGHT) return; // rapid-fire tapping: skip, the cart still updates

  const target = findVisibleTarget();
  if (!target) return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width <= 0 || from.height <= 0) return;

  const hasImage = Boolean(options.imageSrc);
  const size = hasImage ? Math.min(88, Math.max(40, Math.min(from.width, from.height))) : 32;

  // Top-left positions that put the flying box's centre on the source / target centres.
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const endX = to.left + to.width / 2 - size / 2;
  const endY = to.top + to.height / 2 - size / 2;

  // Arc: the midpoint is lifted above the straight line so the item "hops" toward the cart.
  const distance = Math.hypot(endX - startX, endY - startY);
  const lift = Math.min(90, 30 + distance * 0.12);
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 - lift;

  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: hasImage ? "12px" : "9999px",
    pointerEvents: "none",
    zIndex: "9999",
    willChange: "transform, opacity",
    boxShadow: "0 8px 20px -6px rgb(0 0 0 / 0.35)",
    background: hasImage
      ? `center / cover no-repeat url("${(options.imageSrc ?? "").replace(/"/g, "%22")}")`
      : "var(--primary)",
    border: "2px solid var(--card, #fff)",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  inFlight += 1;

  const animation = el.animate(
    [
      { transform: `translate(${startX}px, ${startY}px) scale(1)`, opacity: 0.95 },
      { transform: `translate(${midX}px, ${midY}px) scale(0.6)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${endX}px, ${endY}px) scale(0.2)`, opacity: 0.4 },
    ],
    { duration: 620, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" },
  );

  const finish = () => {
    el.remove();
    inFlight = Math.max(0, inFlight - 1);
    if (target.isConnected) {
      target.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
        { duration: 320, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
      );
    }
  };
  animation.addEventListener("finish", finish, { once: true });
  animation.addEventListener("cancel", finish, { once: true });
}
