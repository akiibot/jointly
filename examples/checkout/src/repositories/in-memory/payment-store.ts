import type { Payment } from "../../models.js";
import type { PaymentRepository } from "../interfaces.js";

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly store = new Map<string, Payment>();

  save(payment: Payment): void {
    this.store.set(payment.id, { ...payment });
  }

  findById(id: string): Payment | undefined {
    const p = this.store.get(id);
    return p ? { ...p } : undefined;
  }

  findByOrderId(orderId: string): Payment[] {
    return Array.from(this.store.values())
      .filter((p) => p.orderId === orderId)
      .map((p) => ({ ...p }));
  }
}
