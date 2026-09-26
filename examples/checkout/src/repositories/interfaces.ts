import type { Order, Coupon } from "../models.js";

export interface OrderRepository {
  save(order: Order): void;
  findById(id: string): Order | undefined;
  /** Return all orders (used in tests). */
  findAll(): Order[];
}

export interface PaymentRepository {
  save(payment: import("../models.js").Payment): void;
  findById(id: string): import("../models.js").Payment | undefined;
  findByOrderId(orderId: string): import("../models.js").Payment[];
  findByIdempotencyKey(key: string): import("../models.js").Payment | undefined;
}

export interface CouponRepository {
  save(coupon: Coupon): void;
  findByCode(code: string): Coupon | undefined;
}
