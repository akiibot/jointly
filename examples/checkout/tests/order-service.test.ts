import { describe, it, expect, beforeEach } from "vitest";
import { OrderService } from "../src/services/order-service.js";
import { InMemoryOrderRepository } from "../src/repositories/in-memory/order-store.js";
import type { Product } from "../src/models.js";

const WIDGET: Product = { id: "prod-1", name: "Widget", unitPrice: 1000 }; // $10.00
const GADGET: Product = { id: "prod-2", name: "Gadget", unitPrice: 2500 }; // $25.00

describe("OrderService", () => {
  let service: OrderService;

  beforeEach(() => {
    service = new OrderService(new InMemoryOrderRepository());
  });

  describe("createOrder", () => {
    it("creates an order with open status and zero totals", () => {
      const order = service.createOrder();
      expect(order.status).toBe("open");
      expect(order.lineItems).toHaveLength(0);
      expect(order.subtotal).toBe(0);
      expect(order.tax).toBe(0);
      expect(order.total).toBe(0);
    });

    it("assigns a unique id to each order", () => {
      const a = service.createOrder();
      const b = service.createOrder();
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("addItem", () => {
    it("adds a line item and recalculates subtotal", () => {
      const order = service.createOrder();
      const updated = service.addItem(order.id, WIDGET, 2);

      expect(updated.lineItems).toHaveLength(1);
      expect(updated.lineItems[0].lineTotal).toBe(2000); // 2 × $10.00
      expect(updated.subtotal).toBe(2000);
    });

    it("accumulates multiple items in the subtotal", () => {
      const order = service.createOrder();
      service.addItem(order.id, WIDGET, 1);
      const updated = service.addItem(order.id, GADGET, 2);

      expect(updated.lineItems).toHaveLength(2);
      expect(updated.subtotal).toBe(1000 + 5000); // $10 + $50
    });

    it("stores the unit price at time of addition", () => {
      const order = service.createOrder();
      const updated = service.addItem(order.id, WIDGET, 3);
      expect(updated.lineItems[0].unitPrice).toBe(1000);
    });

    it("throws when order does not exist", () => {
      expect(() => service.addItem("nonexistent", WIDGET, 1)).toThrow(
        "Order not found",
      );
    });

    it("throws when quantity is less than 1", () => {
      const order = service.createOrder();
      expect(() => service.addItem(order.id, WIDGET, 0)).toThrow(
        "Quantity must be at least 1",
      );
    });

    it("throws when order is not open", () => {
      // Manually create a finalized order by persisting directly.
      const repo = new InMemoryOrderRepository();
      const svc = new OrderService(repo);
      const order = svc.createOrder();
      repo.save({ ...order, status: "finalized" });
      expect(() => svc.addItem(order.id, WIDGET, 1)).toThrow("not open");
    });
  });

  describe("getOrder", () => {
    it("returns the order by id", () => {
      const created = service.createOrder();
      const found = service.getOrder(created.id);
      expect(found.id).toBe(created.id);
    });

    it("throws when order does not exist", () => {
      expect(() => service.getOrder("nonexistent")).toThrow("Order not found");
    });
  });
});
