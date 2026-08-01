"use client";

/**
 * Copy rich text (HTML + plain fallback) with maximum compatibility:
 *
 * 1. Async clipboard API with ClipboardItem (promise-valued for Safari).
 *    Requires a secure context (https / localhost).
 * 2. Legacy selection + execCommand("copy") on a hidden contenteditable —
 *    copies both text/html and text/plain flavors, and still works over
 *    plain http (e.g. hitting a dev server from a phone by LAN IP).
 * 3. Plain-text writeText as a last resort.
 *
 * Returns true when something was copied.
 */
export async function copyRichText(html: string, plain: string): Promise<boolean> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        // Promise values: the form Safari is most reliable with.
        "text/html": Promise.resolve(new Blob([html], { type: "text/html" })),
        "text/plain": Promise.resolve(new Blob([plain], { type: "text/plain" })),
      });
      await navigator.clipboard.write([item]);
      return true;
    } catch {
      // fall through
    }
  }

  if (execCopyRich(html)) return true;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain);
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}

function execCopyRich(html: string): boolean {
  const host = document.createElement("div");
  host.setAttribute("contenteditable", "true");
  host.style.position = "fixed";
  host.style.left = "-9999px";
  host.style.top = "0";
  host.style.opacity = "0";
  host.innerHTML = html;
  document.body.appendChild(host);

  const selection = window.getSelection();
  const saved = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  let ok = false;
  try {
    const range = document.createRange();
    range.selectNodeContents(host);
    selection?.removeAllRanges();
    selection?.addRange(range);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    selection?.removeAllRanges();
    if (saved) selection?.addRange(saved);
    host.remove();
  }
  return ok;
}
