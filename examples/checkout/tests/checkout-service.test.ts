import { describe, it, expect, beforeEach } from "vitest";
import { CheckoutService, calculateTax } from "../src/services/checkout-service.js";
import { OrderService } from "../src/services/order-service.js";
import { InMemoryOrderRepository } from "../src/repositories/in-memory/order-store.js";
import type { Product } from "../src/models.js";

const ITEM: Product = { id: "prod-1", name: "Widget", unitPrice: 1000 }; // $10.00

describe("calculateTax", () => {
  it("calculates 10% tax on an exact amount", () => {
    expect(calculateTax(10000)).toBe(1000); // $100.00 => $10.00 tax
  });

  it("floors fractional cents", () => {
    expect(calculateTax(999)).toBe(99); // $9.99 * 10% = $0.999 => floor => $0.99
  });

  it("returns zero for a zero subtotal", () => {
    expect(calculateTax(0)).toBe(0);
  });

  it("floors when subtotal is not divisible by 10", () => {
    // $9.95 = 995 cents; 10% = 99.5 cents => floor => 99 cents ($0.99)
    expect(calculateTax(995)).toBe(99);
  });
});

describe("CheckoutService", () => {
  let repo: InMemoryOrderRepository;
  let orderService: OrderService;
  let checkoutService: CheckoutService;

  beforeEach(() => {
    repo = new InMemoryOrderRepository();
    orderService = new OrderService(repo);
    checkoutService = new CheckoutService(repo);
  });

  describe("finalizeOrder", () => {
    it("sets status to finalized and calculates tax and total", () => {
      const order = orderService.createOrder();
      orderService.addItem(order.id, ITEM, 2); // subtotal = 2000
      const finalized = checkoutService.finalizeOrder(order.id);

      expect(finalized.status).toBe("finalized");
      expect(finalized.subtotal).toBe(2000);
      expect(finalized.tax).toBe(200); // 10% of 2000
      expect(finalized.total).toBe(2200);
      expect(finalized.finalizedAt).toBeDefined();
    });

    it("persists the finalized state — re-reading returns the same totals", () => {
      const order = orderService.createOrder();
      orderService.addItem(order.id, ITEM, 1); // subtotal = 1000
      checkoutService.finalizeOrder(order.id);

      const reread = orderService.getOrder(order.id);
      expect(reread.status).toBe("finalized");
      expect(reread.total).toBe(1100);
    });

    it("throws when order does not exist", () => {
      expect(() => checkoutService.finalizeOrder("nonexistent")).toThrow(
        "Order not found",
      );
    });

    it("throws when order has no items", () => {
      const order = orderService.createOrder();
      expect(() => checkoutService.finalizeOrder(order.id)).toThrow("no items");
    });

    it("throws when order is already finalized", () => {
      const order = orderService.createOrder();
      orderService.addItem(order.id, ITEM, 1);
      checkoutService.finalizeOrder(order.id);
      expect(() => checkoutService.finalizeOrder(order.id)).toThrow(
        "already finalized",
      );
    });
  });
});
