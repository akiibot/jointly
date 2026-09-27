import { describe, expect, it } from "vitest";
import { AuditedCart } from "../src/audited-cart.js";

describe("compatible discount and audit changes", () => {
  it("records item additions while applying the independent discount contract", () => {
    const audited = new AuditedCart();
    audited.addItem({ sku: "compatible-item", unitPrice: 1_001, quantity: 3 });
    audited.cart.applyDiscount(10);

    expect(audited.cart.subtotal()).toBe(3_003);
    expect(audited.cart.total()).toBe(2_702);
    expect(audited.auditTrail()).toEqual(["added:compatible-item:3"]);

    const external = audited.auditTrail();
    external.push("tampered");
    expect(audited.auditTrail()).toEqual(["added:compatible-item:3"]);
  });
});
