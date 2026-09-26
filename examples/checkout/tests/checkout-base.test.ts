/**
 * Baseline integration tests for the checkout HTTP API.
 *
 * These tests drive the full workflow through the Fastify app and serve as
 * the regression suite that must pass on the main branch, on agent/coupon,
 * on agent/payment-retry, and on the combined branch.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/index.js";
import type { FastifyInstance } from "fastify";
import type { Order, Payment } from "../src/models.js";

const WIDGET = { id: "prod-widget", name: "Widget", unitPrice: 1000 }; // $10.00
const GADGET = { id: "prod-gadget", name: "Gadget", unitPrice: 2500 }; // $25.00

async function post<T>(app: FastifyInstance, url: string, body: unknown): Promise<T> {
  const res = await app.inject({ method: "POST", url, payload: body });
  return JSON.parse(res.body) as T;
}

async function get<T>(app: FastifyInstance, url: string): Promise<T> {
  const res = await app.inject({ method: "GET", url });
  return JSON.parse(res.body) as T;
}

describe("Checkout API — baseline integration", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /orders", () => {
    it("creates an order with open status", async () => {
      const order = await post<Order>(app, "/orders", {});
      expect(order.status).toBe("open");
      expect(order.id).toBeDefined();
      expect(order.lineItems).toHaveLength(0);
    });

    it("each created order has a unique id", async () => {
      const a = await post<Order>(app, "/orders", {});
      const b = await post<Order>(app, "/orders", {});
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("GET /orders/:id", () => {
    it("returns the order", async () => {
      const created = await post<Order>(app, "/orders", {});
      const found = await get<Order>(app, `/orders/${created.id}`);
      expect(found.id).toBe(created.id);
    });

    it("returns 404 for unknown id", async () => {
      const res = await app.inject({ method: "GET", url: "/orders/nonexistent" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /orders/:id/items", () => {
    it("adds an item and updates the subtotal", async () => {
      const order = await post<Order>(app, "/orders", {});
      const updated = await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 3,
      });
      expect(updated.lineItems).toHaveLength(1);
      expect(updated.subtotal).toBe(3000); // 3 × $10
    });

    it("accumulates multiple items", async () => {
      const order = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 2,
      });
      const updated = await post<Order>(app, `/orders/${order.id}/items`, {
        product: GADGET,
        quantity: 1,
      });
      expect(updated.lineItems).toHaveLength(2);
      expect(updated.subtotal).toBe(2000 + 2500); // $20 + $25
    });

    it("returns 400 for unknown order", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/orders/nonexistent/items",
        payload: { product: WIDGET, quantity: 1 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /orders/:id/checkout", () => {
    it("finalizes the order, calculates tax and total", async () => {
      const order = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 4, // subtotal = 4000
      });
      const finalized = await post<Order>(app, `/orders/${order.id}/checkout`, {});

      expect(finalized.status).toBe("finalized");
      expect(finalized.subtotal).toBe(4000);
      expect(finalized.tax).toBe(400);   // 10%
      expect(finalized.total).toBe(4400);
    });

    it("re-reading the order after checkout shows finalized state", async () => {
      const order = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 1,
      });
      await post<Order>(app, `/orders/${order.id}/checkout`, {});

      const reread = await get<Order>(app, `/orders/${order.id}`);
      expect(reread.status).toBe("finalized");
      expect(reread.total).toBe(1100); // 1000 + 100 tax
    });

    it("returns 400 when order has no items", async () => {
      const order = await post<Order>(app, "/orders", {});
      const res = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/checkout`,
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when order is already finalized", async () => {
      const order = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 1,
      });
      await post<Order>(app, `/orders/${order.id}/checkout`, {});
      const res = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/checkout`,
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /payments", () => {
    it("processes a payment for a finalized order", async () => {
      const order = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: GADGET,
        quantity: 2, // subtotal = 5000
      });
      await post<Order>(app, `/orders/${order.id}/checkout`, {});

      const payment = await post<Payment>(app, "/payments", {
        orderId: order.id,
      });

      expect(payment.orderId).toBe(order.id);
      expect(payment.amount).toBe(5500); // 5000 + 500 tax
      expect(payment.status).toBe("succeeded");
    });

    it("returns 400 when order is not finalized", async () => {
      const order = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 1,
      });
      const res = await app.inject({
        method: "POST",
        url: "/payments",
        payload: { orderId: order.id },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for unknown order", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/payments",
        payload: { orderId: "nonexistent" },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("full happy path", () => {
    it("create → add items → checkout → pay — end to end", async () => {
      const order = await post<Order>(app, "/orders", {});

      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 2, // 2000
      });
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: GADGET,
        quantity: 1, // 2500
      });

      const finalized = await post<Order>(app, `/orders/${order.id}/checkout`, {});
      expect(finalized.subtotal).toBe(4500);
      expect(finalized.tax).toBe(450);
      expect(finalized.total).toBe(4950);

      const payment = await post<Payment>(app, "/payments", {
        orderId: order.id,
      });
      expect(payment.amount).toBe(4950);
      expect(payment.status).toBe("succeeded");
    });
  });
});
