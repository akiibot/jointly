import type { Order } from "../models.js";
import type { OrderRepository, CouponRepository } from "../repositories/interfaces.js";

/**
 * Calculates the discount amount for a given subtotal and integer percentage.
 * Uses integer arithmetic: Math.floor((subtotalCents * percent) / 100).
 */
export function calculateDiscount(subtotalCents: number, discountPercent: number): number {
  return Math.floor((subtotalCents * discountPercent) / 100);
}

export class CouponService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly coupons: CouponRepository,
  ) {}

  /**
   * Applies a coupon to an open order.
   *
   * - Throws if the order does not exist.
   * - Throws if the order is already finalized.
   * - Throws if a coupon has already been applied.
   * - Throws if the coupon code is not found.
   * - Discount is applied before tax; the original subtotal is preserved.
   */
  applyCoupon(orderId: string, couponCode: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.status === "finalized") {
      throw new Error(`Cannot apply coupon to a finalized order: ${orderId}`);
    }
    if (order.appliedCouponCode !== undefined) {
      throw new Error(`Order ${orderId} already has a coupon applied`);
    }

    const coupon = this.coupons.findByCode(couponCode);
    if (!coupon) throw new Error(`Coupon not found: ${couponCode}`);

    order.appliedCouponCode = coupon.code;
    order.appliedCouponPercent = coupon.discountPercent;
    order.discountAmount = calculateDiscount(order.subtotal, coupon.discountPercent);
    // Recalculate total with discount (tax is 0 until finalize; keep it consistent)
    const taxableAmount = order.subtotal - order.discountAmount;
    order.total = taxableAmount + order.tax;

    this.orders.save(order);
    return { ...order, lineItems: [...order.lineItems] };
  }
}
