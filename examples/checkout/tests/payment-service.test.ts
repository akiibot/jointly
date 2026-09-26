import { describe, it, expect, beforeEach } from "vitest";
import { PaymentService } from "../src/services/payment-service.js";
import { OrderService } from "../src/services/order-service.js";
import { CheckoutService } from "../src/services/checkout-service.js";
import { InMemoryOrderRepository } from "../src/repositories/in-memory/order-store.js";
import { InMemoryPaymentRepository } from "../src/repositories/in-memory/payment-store.js";
import type { Product } from "../src/models.js";

const ITEM: Product = { id: "prod-1", name: "Widget", unitPrice: 5000 }; // $50.00

describe("PaymentService", () => {
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

  it("creates a payment for a finalized order with the correct amount", () => {
    const order = orderService.createOrder();
    orderService.addItem(order.id, ITEM, 1); // subtotal = 5000
    checkoutService.finalizeOrder(order.id); // total = 5500 (10% tax)

    const payment = paymentService.pay(order.id);

    expect(payment.orderId).toBe(order.id);
    expect(payment.amount).toBe(5500);
    expect(payment.status).toBe("succeeded");
    expect(payment.id).toBeDefined();
  });

  it("assigns a unique id to each payment", () => {
    const order1 = orderService.createOrder();
    orderService.addItem(order1.id, ITEM, 1);
    checkoutService.finalizeOrder(order1.id);

    const order2 = orderService.createOrder();
    orderService.addItem(order2.id, ITEM, 1);
    checkoutService.finalizeOrder(order2.id);

    const p1 = paymentService.pay(order1.id);
    const p2 = paymentService.pay(order2.id);

    expect(p1.id).not.toBe(p2.id);
  });

  it("throws when order does not exist", () => {
    expect(() => paymentService.pay("nonexistent")).toThrow("Order not found");
  });

  it("throws when order is not finalized", () => {
    const order = orderService.createOrder();
    orderService.addItem(order.id, ITEM, 1);
    expect(() => paymentService.pay(order.id)).toThrow("must be finalized");
  });
});
