import { describe, expect, it } from "vitest";
import { escapeHtml, renderEmail } from "@/lib/email";

describe("transactional email", () => {
  it("escapes user-supplied text", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).not.toContain("<img");
  });
  it("renders html and plain text with the call to action", () => {
    const { html, text } = renderEmail({ subject: "s", heading: "Hi <b>", body: ["Line"], cta: { label: "Go", href: "https://example.com/x" } });
    expect(html).toContain("Hi &lt;b&gt;");
    expect(text).toContain("Go: https://example.com/x");
  });
});
