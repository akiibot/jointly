import type { Order } from "../../models.js";
import type { OrderRepository } from "../interfaces.js";

export class InMemoryOrderRepository implements OrderRepository {
  private readonly store = new Map<string, Order>();

  save(order: Order): void {
    this.store.set(order.id, { ...order, lineItems: [...order.lineItems] });
  }

  findById(id: string): Order | undefined {
    const order = this.store.get(id);
    if (!order) return undefined;
    return { ...order, lineItems: [...order.lineItems] };
  }

  findAll(): Order[] {
    return Array.from(this.store.values()).map((o) => ({
      ...o,
      lineItems: [...o.lineItems],
    }));
  }
}
