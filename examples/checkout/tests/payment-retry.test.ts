/**
 * Focused tests for idempotent payment-retry behaviour.
 *
 * Covers:
 *  1. First keyed payment is created and returned.
 *  2. Same-key replay returns the original payment.
 *  3. Same-key replay does not create an additional payment record.
 *  4. Same-key replay leaves the order unchanged.
 *  5. Different keys create different payment attempts.
 *  6. Same key with a different order is rejected.
 *  7. Legacy payment without a key still works.
 *  8. Replay rejects a financially inconsistent order without creating a duplicate.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PaymentService } from "../src/services/payment-service.js";
import { OrderService } from "../src/services/order-service.js";
import { CheckoutService } from "../src/services/checkout-service.js";
import { InMemoryOrderRepository } from "../src/repositories/in-memory/order-store.js";
import { InMemoryPaymentRepository } from "../src/repositories/in-memory/payment-store.js";
import type { Product } from "../src/models.js";

const WIDGET: Product = { id: "prod-1", name: "Widget", unitPrice: 5000 }; // $50.00

/** Helper: create, populate, and finalize an order. Returns the finalized order. */
function makeOrder(
  orderService: OrderService,
  checkoutService: CheckoutService,
  product: Product = WIDGET,
  quantity = 1,
) {
  const order = orderService.createOrder();
  orderService.addItem(order.id, product, quantity);
  return checkoutService.finalizeOrder(order.id);
}

describe("PaymentService — idempotent payment retry", () => {
  let orderRepo: InMemoryOrderRepository;
  let paymentRepo: InMemoryPaymentRepository;
  let orderService: OrderService;
  let checkoutService: CheckoutService;
  let paymentService: PaymentService;

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    paymentRepo = new InMemoryPaymentRepository();
    orderService = new OrderService(orderRepo);
    checkoutService = new CheckoutService(orderRepo);
    paymentService = new PaymentService(orderRepo, paymentRepo);
  });

  // -------------------------------------------------------------------------
  // 1. First keyed payment is created and returned
  // -------------------------------------------------------------------------
  it("creates a payment on the first request for a new idempotency key", () => {
    const order = makeOrder(orderService, checkoutService);

    const payment = paymentService.pay(order.id, "key-001");

    expect(payment.id).toBeDefined();
    expect(payment.orderId).toBe(order.id);
    expect(payment.amount).toBe(order.total);
    expect(payment.status).toBe("succeeded");
    expect(payment.idempotencyKey).toBe("key-001");
  });

  // -------------------------------------------------------------------------
  // 2. Same-key replay returns the original payment (same id, same createdAt)
  // -------------------------------------------------------------------------
  it("returns the original payment when the same key is replayed", () => {
    const order = makeOrder(orderService, checkoutService);

    const first = paymentService.pay(order.id, "key-002");
    const replay = paymentService.pay(order.id, "key-002");

    expect(replay.id).toBe(first.id);
    expect(replay.createdAt).toBe(first.createdAt);
    expect(replay.amount).toBe(first.amount);
    expect(replay.orderId).toBe(first.orderId);
  });

  // -------------------------------------------------------------------------
  // 3. Same-key replay does not create an additional payment record
  // -------------------------------------------------------------------------
  it("does not create a second payment record on replay", () => {
    const order = makeOrder(orderService, checkoutService);

    paymentService.pay(order.id, "key-003");
    paymentService.pay(order.id, "key-003");

    const all = paymentRepo.findByOrderId(order.id);
    expect(all).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 4. Same-key replay leaves the order unchanged
  // -------------------------------------------------------------------------
  it("does not modify the finalized order on replay", () => {
    const order = makeOrder(orderService, checkoutService);
    const snapshot = orderRepo.findById(order.id)!;

    paymentService.pay(order.id, "key-004");
    paymentService.pay(order.id, "key-004");

    const after = orderRepo.findById(order.id)!;
    expect(after).toEqual(snapshot);
  });

  // -------------------------------------------------------------------------
  // 5. Different keys create different payment attempts
  // -------------------------------------------------------------------------
  it("creates a separate payment for each distinct idempotency key", () => {
    const order = makeOrder(orderService, checkoutService);

    const p1 = paymentService.pay(order.id, "key-A");
    const p2 = paymentService.pay(order.id, "key-B");

    expect(p1.id).not.toBe(p2.id);
    expect(p1.idempotencyKey).toBe("key-A");
    expect(p2.idempotencyKey).toBe("key-B");

    const all = paymentRepo.findByOrderId(order.id);
    expect(all).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // 6. Same key with a different order is rejected
  // -------------------------------------------------------------------------
  it("rejects reuse of an idempotency key for a different order", () => {
    const order1 = makeOrder(orderService, checkoutService);
    const order2 = makeOrder(orderService, checkoutService);

    paymentService.pay(order1.id, "key-shared");

    expect(() => paymentService.pay(order2.id, "key-shared")).toThrow(
      "different order",
    );
  });

  // -------------------------------------------------------------------------
  // 7. Legacy payment without a key still works
  // -------------------------------------------------------------------------
  it("processes a payment with no idempotency key (legacy behaviour)", () => {
    const order = makeOrder(orderService, checkoutService);

    const payment = paymentService.pay(order.id);

    expect(payment.id).toBeDefined();
    expect(payment.orderId).toBe(order.id);
    expect(payment.amount).toBe(order.total);
    expect(payment.status).toBe("succeeded");
    expect(payment.idempotencyKey).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 8. Replay rejects a financially inconsistent order without creating a dup
  // -------------------------------------------------------------------------
  it("rejects replay when the stored order total is financially inconsistent", () => {
    const order = makeOrder(orderService, checkoutService);

    // First payment succeeds — order is consistent.
    paymentService.pay(order.id, "key-corrupt");

    // Tamper: manually corrupt the stored order so total !== subtotal + tax.
    const stored = orderRepo.findById(order.id)!;
    stored.total = stored.total + 1; // introduce a 1-cent discrepancy
    orderRepo.save(stored);

    // Replay must be rejected.
    expect(() => paymentService.pay(order.id, "key-corrupt")).toThrow(
      "financial integrity check",
    );

    // No additional payment must have been created.
    const all = paymentRepo.findByOrderId(order.id);
    expect(all).toHaveLength(1);
  });
});
