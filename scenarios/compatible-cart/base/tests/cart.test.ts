import { describe, expect, it } from "vitest";
import { Cart } from "../src/cart.js";

describe("Cart", () => {
  it("totals integer-cent line items", () => {
    const cart = new Cart();
    cart.addItem({ sku: "base-item", unitPrice: 1_250, quantity: 2 });
    expect(cart.subtotal()).toBe(2_500);
    expect(cart.total()).toBe(2_500);
  });
});
