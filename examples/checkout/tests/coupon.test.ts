/**
 * Focused tests for the coupon feature.
 *
 * Scope: coupon application only — no payment-retry or idempotency behavior.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/index.js";
import type { FastifyInstance } from "fastify";
import type { Order } from "../src/models.js";
import { calculateDiscount } from "../src/services/coupon-service.js";

const WIDGET = { id: "prod-widget", name: "Widget", unitPrice: 1000 }; // $10.00
const GADGET = { id: "prod-gadget", name: "Gadget", unitPrice: 2500 }; // $25.00

async function post<T>(app: FastifyInstance, url: string, body: unknown): Promise<{ status: number; body: T }> {
  const res = await app.inject({ method: "POST", url, payload: body });
  return { status: res.statusCode, body: JSON.parse(res.body) as T };
}

// ---------------------------------------------------------------------------
// Unit: calculateDiscount
// ---------------------------------------------------------------------------

describe("calculateDiscount", () => {
  it("returns floor of subtotal * percent / 100", () => {
    expect(calculateDiscount(1000, 10)).toBe(100);  // $10 × 10% = $1
    expect(calculateDiscount(2500, 20)).toBe(500);  // $25 × 20% = $5
    expect(calculateDiscount(999, 10)).toBe(99);    // floor(99.9) = 99
    expect(calculateDiscount(0, 20)).toBe(0);
  });

  it("uses integer arithmetic — no floating-point drift", () => {
    // $33.33 × 10% should be floor(333.3) = 333 cents, not 333.3...
    expect(calculateDiscount(3333, 10)).toBe(333);
  });
});

// ---------------------------------------------------------------------------
// Integration: coupon API routes
// ---------------------------------------------------------------------------

describe("Coupon API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createOrderWithItem(unitPrice = 1000, quantity = 4): Promise<Order> {
    const { body: order } = await post<Order>(app, "/orders", {});
    const product = { id: "prod-test", name: "Test", unitPrice };
    const { body: updated } = await post<Order>(app, `/orders/${order.id}/items`, {
      product,
      quantity,
    });
    return updated;
  }

  describe("POST /orders/:id/coupons — valid coupon (SAVE10 = 10%)", () => {
    it("reduces the order total by the discount amount", async () => {
      const order = await createOrderWithItem(1000, 4); // subtotal = 4000
      const { status, body: updated } = await post<Order>(
        app,
        `/orders/${order.id}/coupons`,
        { code: "SAVE10" },
      );
      expect(status).toBe(200);
      // discount = floor(4000 * 10 / 100) = 400
      expect(updated.discountAmount).toBe(400);
      expect(updated.appliedCouponCode).toBe("SAVE10");
      // subtotal preserved
      expect(updated.subtotal).toBe(4000);
      // total = (4000 - 400) + 0 tax (not yet finalized)
      expect(updated.total).toBe(3600);
    });

    it("tax is calculated on the discounted amount after finalize", async () => {
      const order = await createOrderWithItem(1000, 4); // subtotal = 4000
      await post<Order>(app, `/orders/${order.id}/coupons`, { code: "SAVE10" });
      // taxable = 4000 - 400 = 3600; tax = floor(3600 * 10 / 100) = 360
      const { body: finalized } = await post<Order>(
        app,
        `/orders/${order.id}/checkout`,
        {},
      );
      expect(finalized.subtotal).toBe(4000);
      expect(finalized.discountAmount).toBe(400);
      expect(finalized.tax).toBe(360);
      expect(finalized.total).toBe(3960); // 3600 + 360
    });
  });

  describe("POST /orders/:id/coupons — valid coupon (SAVE20 = 20%)", () => {
    it("applies a 20% discount correctly", async () => {
      // 2 × WIDGET ($10) + 1 × GADGET ($25) = subtotal 4500
      const { body: order } = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 2,
      });
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: GADGET,
        quantity: 1,
      });
      const { body: withCoupon } = await post<Order>(
        app,
        `/orders/${order.id}/coupons`,
        { code: "SAVE20" },
      );
      // discount = floor(4500 * 20 / 100) = 900
      expect(withCoupon.discountAmount).toBe(900);
      expect(withCoupon.subtotal).toBe(4500);
      expect(withCoupon.total).toBe(3600); // 4500 - 900 + 0 tax
    });
  });

  describe("POST /orders/:id/coupons — guard: only once per order", () => {
    it("returns 400 when a coupon is applied a second time", async () => {
      const order = await createOrderWithItem();
      await post<Order>(app, `/orders/${order.id}/coupons`, { code: "SAVE10" });
      const { status, body } = await post<{ error: string }>(
        app,
        `/orders/${order.id}/coupons`,
        { code: "SAVE10" },
      );
      expect(status).toBe(400);
      expect((body as { error: string }).error).toMatch(/already has a coupon/);
    });

    it("cannot apply a second different coupon either", async () => {
      const order = await createOrderWithItem();
      await post<Order>(app, `/orders/${order.id}/coupons`, { code: "SAVE10" });
      const { status } = await post<unknown>(
        app,
        `/orders/${order.id}/coupons`,
        { code: "SAVE20" },
      );
      expect(status).toBe(400);
    });
  });

  describe("POST /orders/:id/coupons — guard: invalid coupon", () => {
    it("returns 400 for an unknown coupon code", async () => {
      const order = await createOrderWithItem();
      const { status, body } = await post<{ error: string }>(
        app,
        `/orders/${order.id}/coupons`,
        { code: "NOTREAL" },
      );
      expect(status).toBe(400);
      expect((body as { error: string }).error).toMatch(/Coupon not found/);
    });

    it("does not modify the order when the coupon is invalid", async () => {
      const order = await createOrderWithItem(); // subtotal = 4000
      await post<unknown>(app, `/orders/${order.id}/coupons`, { code: "NOTREAL" });
      // Re-read the order
      const res = await app.inject({ method: "GET", url: `/orders/${order.id}` });
      const reread = JSON.parse(res.body) as Order;
      expect(reread.discountAmount).toBe(0);
      expect(reread.appliedCouponCode).toBeUndefined();
      expect(reread.subtotal).toBe(4000);
    });
  });

  describe("POST /orders/:id/coupons — guard: finalized order", () => {
    it("returns 400 when applied after checkout", async () => {
      const order = await createOrderWithItem();
      await post<Order>(app, `/orders/${order.id}/checkout`, {});
      const { status } = await post<unknown>(
        app,
        `/orders/${order.id}/coupons`,
        { code: "SAVE10" },
      );
      expect(status).toBe(400);
    });
  });

  describe("discount recalculates when items are added after coupon is applied", () => {
    it("10% discount tracks new subtotal after a second item is added", async () => {
      // Step 1: create order + first item  (subtotal = 4000)
      const { body: order } = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 4, // 4 × $10 = $40.00 = 4000 cents
      });

      // Step 2: apply SAVE10 (10%) — discount based on 4000
      const { body: afterCoupon } = await post<Order>(
        app,
        `/orders/${order.id}/coupons`,
        { code: "SAVE10" },
      );
      expect(afterCoupon.subtotal).toBe(4000);
      expect(afterCoupon.discountAmount).toBe(400);  // floor(4000*10/100)
      expect(afterCoupon.total).toBe(3600);          // 4000 - 400, tax still 0

      // Step 3: add another item (subtotal becomes 4000 + 2500 = 6500)
      const { body: afterSecondItem } = await post<Order>(
        app,
        `/orders/${order.id}/items`,
        { product: GADGET, quantity: 1 }, // $25.00 = 2500 cents
      );
      expect(afterSecondItem.subtotal).toBe(6500);
      // discount must be recalculated: floor(6500*10/100) = 650
      expect(afterSecondItem.discountAmount).toBe(650);
      // total = 6500 - 650 + 0 tax = 5850
      expect(afterSecondItem.total).toBe(5850);
      expect(afterSecondItem.appliedCouponCode).toBe("SAVE10");
    });
  });

  describe("coupon full happy path with payment", () => {
    it("create → add items → apply coupon → checkout → pay", async () => {
      const { body: order } = await post<Order>(app, "/orders", {});
      await post<Order>(app, `/orders/${order.id}/items`, {
        product: WIDGET,
        quantity: 4, // 4000
      });
      // Apply SAVE10: discount = 400, taxable = 3600, tax = 360, total = 3960
      const { body: withCoupon } = await post<Order>(
        app,
        `/orders/${order.id}/coupons`,
        { code: "SAVE10" },
      );
      expect(withCoupon.discountAmount).toBe(400);

      const { body: finalized } = await post<Order>(
        app,
        `/orders/${order.id}/checkout`,
        {},
      );
      expect(finalized.status).toBe("finalized");
      expect(finalized.tax).toBe(360);
      expect(finalized.total).toBe(3960);

      const { body: payment } = await post<{ amount: number; status: string }>(
        app,
        "/payments",
        { orderId: order.id },
      );
      expect(payment.amount).toBe(3960);
      expect(payment.status).toBe("succeeded");
    });
  });
});
