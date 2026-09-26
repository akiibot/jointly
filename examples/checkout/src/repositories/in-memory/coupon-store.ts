import type { Coupon } from "../../models.js";
import type { CouponRepository } from "../interfaces.js";

export class InMemoryCouponRepository implements CouponRepository {
  private readonly store = new Map<string, Coupon>();

  save(coupon: Coupon): void {
    this.store.set(coupon.code, { ...coupon });
  }

  findByCode(code: string): Coupon | undefined {
    const coupon = this.store.get(code);
    return coupon ? { ...coupon } : undefined;
  }
}
