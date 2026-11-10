import type { KeyboardEvent } from "react";

/**
 * Zewar habit: pressing Enter moves to the next field instead of submitting.
 * Put `onKeyDown={enterToNext}` on a form container. Text areas, buttons and
 * search/combobox inputs keep their normal Enter behaviour.
 */
export function enterToNext(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target as HTMLElement;
  if (!(target instanceof HTMLInputElement)) return;
  if (["button", "submit", "checkbox", "radio", "file"].includes(target.type)) return;
  if (target.closest("[cmdk-root], [role='combobox'], [data-enter-submit]")) return;
  const container = event.currentTarget;
  const fields = Array.from(
    container.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button[role=combobox]:not([disabled])")
  ).filter(element => element.offsetParent !== null);
  const index = fields.indexOf(target);
  const next = index >= 0 ? fields[index + 1] : undefined;
  if (!next) return;
  event.preventDefault();
  next.focus();
  if (next instanceof HTMLInputElement) next.select();
}
