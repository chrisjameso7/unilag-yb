import { describe, expect, it } from "vitest";
import { sniff } from "@/lib/uploads";

const bytes = (...b: number[]) => Buffer.from(b);

describe("upload type sniffing (magic bytes, not the browser's claim)", () => {
  it("recognises JPEG, PNG, WebP and PDF", () => {
    expect(sniff(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniff(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(sniff(Buffer.concat([Buffer.from("RIFF"), bytes(0, 0, 0, 0), Buffer.from("WEBP")]))).toBe("image/webp");
    expect(sniff(Buffer.from("%PDF-1.7"))).toBe("application/pdf");
  });

  it("rejects HTML, scripts and SVG disguised as images", () => {
    expect(sniff(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniff(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniff(Buffer.from("GIF89a"))).toBeNull();
    expect(sniff(Buffer.alloc(0))).toBeNull();
  });
});
