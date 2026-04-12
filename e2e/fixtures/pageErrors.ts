import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Collect runtime errors (e.g. Rules of Hooks) during a test; call the returned assert at the end. */
export function trackPageErrors(page: Page) {
  const messages: string[] = [];
  page.on("pageerror", (err) => {
    messages.push(err.message);
  });
  return () => expect(messages, messages.join("\n")).toEqual([]);
}
