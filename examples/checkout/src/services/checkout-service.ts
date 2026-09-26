import type { Order } from "../models.js";
import type { OrderRepository } from "../repositories/interfaces.js";

/** Tax rate as an integer percentage (10 = 10%). */
const TAX_PERCENT = 10;

/**
 * Calculates tax on a subtotal (in cents) and returns the result in cents,
 * rounded down to the nearest cent.
 *
 * Uses integer percentage arithmetic to avoid floating-point representation
 * errors: Math.floor((subtotalCents * TAX_PERCENT) / 100).
 */
export function calculateTax(subtotalCents: number): number {
  return Math.floor((subtotalCents * TAX_PERCENT) / 100);
}

export class CheckoutService {
  constructor(private readonly orders: OrderRepository) {}

  /**
   * Finalizes the order: calculates tax and total, marks status as finalized.
   * Throws if the order is already finalized or has no items.
   */
  finalizeOrder(orderId: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.status === "finalized") {
      throw new Error(`Order ${orderId} is already finalized`);
    }
    if (order.lineItems.length === 0) {
      throw new Error(`Order ${orderId} has no items`);
    }

    order.tax = calculateTax(order.subtotal);
    order.total = order.subtotal + order.tax;
    order.status = "finalized";
    order.finalizedAt = new Date().toISOString();

    this.orders.save(order);
    return { ...order, lineItems: [...order.lineItems] };
  }
}
