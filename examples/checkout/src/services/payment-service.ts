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
   *
   * When an idempotencyKey is supplied:
   *  - If a payment already exists for that key, the replay path is taken:
   *    the order's financial integrity (total === subtotal + tax) is verified
   *    and the original payment is returned unchanged.
   *  - If no payment exists for that key, the first-attempt path is taken:
   *    a new payment is created and stored with the key.
   *  - Reusing the same key for a different order is rejected.
   *
   * When no idempotencyKey is supplied, a one-time payment is created exactly
   * as before (legacy behaviour, no replay semantics).
   *
   * Throws if the order does not exist or is not finalized.
   */
  pay(orderId: string, idempotencyKey?: string): Payment {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.status !== "finalized") {
      throw new Error(`Order ${orderId} must be finalized before payment`);
    }

    // --- Keyed path ---
    if (idempotencyKey !== undefined) {
      const existing = this.payments.findByIdempotencyKey(idempotencyKey);

      if (existing) {
        // Replay path: verify the key belongs to the same order.
        if (existing.orderId !== orderId) {
          throw new Error(
            `Idempotency key ${idempotencyKey} was used for a different order`,
          );
        }

        // Replay-time financial integrity check.
        if (order.total !== order.subtotal + order.tax) {
          throw new Error(
            `Order ${orderId} failed financial integrity check: ` +
              `total (${order.total}) !== subtotal (${order.subtotal}) + tax (${order.tax})`,
          );
        }

        // Return the original payment unchanged.
        return { ...existing };
      }

      // First attempt with this key — create and persist.
      const payment: Payment = {
        id: randomUUID(),
        orderId,
        amount: order.total,
        status: "succeeded",
        createdAt: new Date().toISOString(),
        idempotencyKey,
      };
      this.payments.save(payment);
      return { ...payment };
    }

    // --- Legacy (no-key) path ---
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
