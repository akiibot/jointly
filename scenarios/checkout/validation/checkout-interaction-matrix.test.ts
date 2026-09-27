import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/index.js";
import { buildCheckoutSchedule } from "./deterministic-schedule.js";

async function createOrder(app: FastifyInstance, unitPrice = 4_000, quantity = 1) {
  const created = await app.inject({ method: "POST", url: "/orders" });
  expect(created.statusCode).toBe(201);
  const order = created.json<{ id: string }>();
  const item = await app.inject({
    method: "POST",
    url: `/orders/${order.id}/items`,
    payload: { product: { id: "boundary-product", name: "Boundary product", unitPrice }, quantity },
  });
  expect(item.statusCode).toBe(200);
  return order.id;
}

async function readOrder(app: FastifyInstance, orderId: string) {
  const response = await app.inject({ method: "GET", url: `/orders/${orderId}` });
  expect(response.statusCode).toBe(200);
  return response.json<Record<string, unknown>>();
}

async function finalize(app: FastifyInstance, orderId: string, coupon?: string) {
  if (coupon) {
    const response = await app.inject({ method: "POST", url: `/orders/${orderId}/coupons`, payload: { code: coupon } });
    expect(response.statusCode).toBe(200);
  }
  const response = await app.inject({ method: "POST", url: `/orders/${orderId}/checkout` });
  expect(response.statusCode).toBe(200);
  return response.json<Record<string, unknown>>();
}

async function pay(app: FastifyInstance, orderId: string, idempotencyKey: string) {
  return app.inject({ method: "POST", url: "/payments", payload: { orderId, idempotencyKey } });
}

describe("coupon and payment-retry interaction matrix", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => { app = buildApp(); });
  afterEach(async () => { await app.close(); });

  it.each([
    { coupon: undefined, discount: 0, tax: 400, total: 4_400 },
    { coupon: "SAVE10", discount: 400, tax: 360, total: 3_960 },
    { coupon: "SAVE20", discount: 800, tax: 320, total: 3_520 },
  ])("preserves the financial boundary with coupon $coupon", async ({ coupon, discount, tax, total }) => {
    const orderId = await createOrder(app);
    const order = await finalize(app, orderId, coupon);
    expect(order).toMatchObject({ subtotal: 4_000, discountAmount: discount, tax, total, status: "finalized" });
  });

  it("rejects an invalid coupon without changing the order", async () => {
    const orderId = await createOrder(app);
    const before = await readOrder(app, orderId);
    const response = await app.inject({ method: "POST", url: `/orders/${orderId}/coupons`, payload: { code: "NOT-A-COUPON" } });
    expect(response.statusCode).toBe(400);
    expect(await readOrder(app, orderId)).toEqual(before);
  });

  it("returns the original payment for sequential same-key replay without changing the order", async () => {
    const orderId = await createOrder(app);
    await finalize(app, orderId, "SAVE10");
    const before = await readOrder(app, orderId);
    const first = await pay(app, orderId, "sequential-key");
    const replay = await pay(app, orderId, "sequential-key");
    expect([first.statusCode, replay.statusCode]).toEqual([201, 201]);
    expect(replay.json()).toEqual(first.json());
    expect(await readOrder(app, orderId)).toEqual(before);
  });

  it("treats different keys as different payment attempts", async () => {
    const orderId = await createOrder(app);
    await finalize(app, orderId, "SAVE20");
    const first = await pay(app, orderId, "different-key-a");
    const second = await pay(app, orderId, "different-key-b");
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json<{ id: string }>().id).not.toBe(first.json<{ id: string }>().id);
  });

  it("deduplicates concurrent same-key requests against one in-process store", async () => {
    const orderId = await createOrder(app);
    await finalize(app, orderId, "SAVE10");
    const before = await readOrder(app, orderId);
    const responses = await Promise.all(Array.from({ length: 8 }, () => pay(app, orderId, "concurrent-key")));
    expect(responses.every((response) => response.statusCode === 201)).toBe(true);
    expect(new Set(responses.map((response) => response.json<{ id: string }>().id)).size).toBe(1);
    expect(await readOrder(app, orderId)).toEqual(before);
  });

  it("reproduces schedules by seed and changes the seeded tail", () => {
    expect(buildCheckoutSchedule(20260926, 9)).toEqual(buildCheckoutSchedule(20260926, 9));
    expect(buildCheckoutSchedule(20260926, 9).slice(5)).not.toEqual(buildCheckoutSchedule(20260927, 9).slice(5));
  });

  const scheduleSeed = Number(process.env.JOINTLY_SEED ?? 20260926);
  const schedule = buildCheckoutSchedule(scheduleSeed, 9);
  it.each(schedule)("executes deterministic case $id with seed $seed", async (scenario) => {
    const orderId = await createOrder(app, scenario.unitPrice, scenario.quantity);
    const beforeCoupon = await readOrder(app, orderId);
    let appliedCoupon: "SAVE10" | "SAVE20" | undefined;
    if (scenario.coupon === "INVALID") {
      const rejected = await app.inject({ method: "POST", url: `/orders/${orderId}/coupons`, payload: { code: "INVALID" } });
      expect(rejected.statusCode).toBe(400);
      expect(await readOrder(app, orderId)).toEqual(beforeCoupon);
    } else {
      appliedCoupon = scenario.coupon;
    }
    const finalized = await finalize(app, orderId, appliedCoupon);
    const subtotal = scenario.unitPrice * scenario.quantity;
    const percent = appliedCoupon === "SAVE10" ? 10 : appliedCoupon === "SAVE20" ? 20 : 0;
    const discountAmount = Math.floor((subtotal * percent) / 100);
    const tax = Math.floor(((subtotal - discountAmount) * 10) / 100);
    expect(finalized).toMatchObject({ subtotal, discountAmount, tax, total: subtotal - discountAmount + tax });
    const beforePayment = await readOrder(app, orderId);

    if (scenario.requestMode === "different-keys") {
      const responses = await Promise.all([pay(app, orderId, `${scenario.id}-a`), pay(app, orderId, `${scenario.id}-b`)]);
      expect(new Set(responses.map((response) => response.json<{ id: string }>().id)).size).toBe(2);
    } else {
      const key = `${scenario.id}-same`;
      const responses = scenario.requestMode === "concurrent-same-key"
        ? await Promise.all(Array.from({ length: scenario.requestCount }, () => pay(app, orderId, key)))
        : [];
      if (scenario.requestMode === "sequential-same-key") {
        for (let index = 0; index < scenario.requestCount; index += 1) responses.push(await pay(app, orderId, key));
      }
      expect(responses.every((response) => response.statusCode === 201)).toBe(true);
      expect(new Set(responses.map((response) => response.json<{ id: string }>().id)).size).toBe(1);
    }
    expect(await readOrder(app, orderId)).toEqual(beforePayment);
  });
});
