import { randomUUID } from "crypto";
import type { Payment } from "../models.js";
import type { OrderRepository, PaymentRepository } from "../repositories/interfaces.js";

export class PaymentService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentRepository,
  ) {}

  /**
   * Processes a payment for a finalized order.
   * Throws if the order does not exist or is not finalized.
   */
  pay(orderId: string): Payment {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.status !== "finalized") {
      throw new Error(`Order ${orderId} must be finalized before payment`);
    }

    const payment: Payment = {
      id: randomUUID(),
      orderId,
      amount: order.total,
      status: "succeeded",
      createdAt: new Date().toISOString(),
    };

    this.payments.save(payment);
    return { ...payment };
  }
}
