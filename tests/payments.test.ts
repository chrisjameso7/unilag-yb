import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { devHarnessEnabled, isValidPaystackSignature } from "@/lib/payments";

const SECRET = "sk_test_unit_secret";
const env = process.env as Record<string, string | undefined>;

describe("Paystack webhook signature", () => {
  afterEach(() => {
    delete env.PAYSTACK_SECRET_KEY;
  });

  it("accepts a correct HMAC-SHA512 of the raw body", () => {
    env.PAYSTACK_SECRET_KEY = SECRET;
    const body = JSON.stringify({ event: "charge.success", data: { reference: "uly_abc" } });
    const sig = createHmac("sha512", SECRET).update(body).digest("hex");
    expect(isValidPaystackSignature(body, sig)).toBe(true);
  });

  it("rejects a tampered body", () => {
    env.PAYSTACK_SECRET_KEY = SECRET;
    const body = JSON.stringify({ event: "charge.success", data: { amount: 299900 } });
    const sig = createHmac("sha512", SECRET).update(body).digest("hex");
    expect(isValidPaystackSignature(body.replace("299900", "100"), sig)).toBe(false);
  });

  it("rejects missing signature or missing secret", () => {
    env.PAYSTACK_SECRET_KEY = SECRET;
    expect(isValidPaystackSignature("{}", null)).toBe(false);
    delete env.PAYSTACK_SECRET_KEY;
    const sig = createHmac("sha512", SECRET).update("{}").digest("hex");
    expect(isValidPaystackSignature("{}", sig)).toBe(false);
  });

  it("rejects a signature made with a different key", () => {
    env.PAYSTACK_SECRET_KEY = SECRET;
    const sig = createHmac("sha512", "other").update("{}").digest("hex");
    expect(isValidPaystackSignature("{}", sig)).toBe(false);
  });
});

describe("dev payment harness", () => {
  const original = env.NODE_ENV;
  afterEach(() => {
    env.NODE_ENV = original;
    delete env.ALLOW_TEST_PAYMENTS;
  });

  it("is never available in production", () => {
    env.NODE_ENV = "production";
    env.ALLOW_TEST_PAYMENTS = "true";
    expect(devHarnessEnabled()).toBe(false);
  });

  it("requires an explicit opt-in", () => {
    env.NODE_ENV = "development";
    expect(devHarnessEnabled()).toBe(false);
    env.ALLOW_TEST_PAYMENTS = "true";
    expect(devHarnessEnabled()).toBe(true);
  });
});
