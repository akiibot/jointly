import { randomUUID } from "crypto";
import type { Order, LineItem, Product } from "../models.js";
import type { OrderRepository } from "../repositories/interfaces.js";

export class OrderService {
  constructor(private readonly orders: OrderRepository) {}

  createOrder(): Order {
    const order: Order = {
      id: randomUUID(),
      status: "open",
      lineItems: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: new Date().toISOString(),
    };
    this.orders.save(order);
    return { ...order };
  }

  addItem(orderId: string, product: Product, quantity: number): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.status !== "open") throw new Error(`Order ${orderId} is not open`);
    if (quantity < 1) throw new Error("Quantity must be at least 1");

    const lineTotal = product.unitPrice * quantity;
    const item: LineItem = {
      productId: product.id,
      productName: product.name,
      unitPrice: product.unitPrice,
      quantity,
      lineTotal,
    };

    order.lineItems.push(item);
    order.subtotal = order.lineItems.reduce((s, l) => s + l.lineTotal, 0);
    order.total = order.subtotal + order.tax;
    this.orders.save(order);
    return { ...order, lineItems: [...order.lineItems] };
  }

  getOrder(orderId: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    return order;
  }
}
