export type ScheduledCoupon = "SAVE10" | "SAVE20" | "INVALID" | undefined;
export type ScheduledRequestMode = "sequential-same-key" | "different-keys" | "concurrent-same-key";

export interface CheckoutScheduleCase {
  id: string;
  seed: number;
  unitPrice: number;
  quantity: number;
  coupon: ScheduledCoupon;
  requestMode: ScheduledRequestMode;
  requestCount: number;
}

function nextUint32(seed: number): number {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

const REQUIRED_BOUNDARIES: Omit<CheckoutScheduleCase, "seed">[] = [
  { id: "zero-cent-no-coupon", unitPrice: 0, quantity: 1, coupon: undefined, requestMode: "sequential-same-key", requestCount: 2 },
  { id: "one-cent-rounding", unitPrice: 1, quantity: 1, coupon: "SAVE10", requestMode: "concurrent-same-key", requestCount: 8 },
  { id: "below-tax-cent-boundary", unitPrice: 9, quantity: 1, coupon: "SAVE20", requestMode: "different-keys", requestCount: 2 },
  { id: "exact-tax-boundary", unitPrice: 100, quantity: 1, coupon: "SAVE10", requestMode: "sequential-same-key", requestCount: 2 },
  { id: "invalid-coupon-immutability", unitPrice: 101, quantity: 2, coupon: "INVALID", requestMode: "concurrent-same-key", requestCount: 4 },
];

export function buildCheckoutSchedule(baseSeed: number, iterations: number): CheckoutScheduleCase[] {
  if (!Number.isSafeInteger(baseSeed)) throw new Error("baseSeed must be a safe integer");
  if (!Number.isInteger(iterations) || iterations < REQUIRED_BOUNDARIES.length) {
    throw new Error(`iterations must be at least ${REQUIRED_BOUNDARIES.length} to cover required boundaries`);
  }
  const prices = [0, 1, 9, 10, 99, 100, 101, 999, 4_000, 9_999];
  const coupons: ScheduledCoupon[] = [undefined, "SAVE10", "SAVE20", "INVALID"];
  const modes: ScheduledRequestMode[] = ["sequential-same-key", "different-keys", "concurrent-same-key"];

  return Array.from({ length: iterations }, (_, index) => {
    const seed = baseSeed + index;
    if (index < REQUIRED_BOUNDARIES.length) return { ...REQUIRED_BOUNDARIES[index]!, seed };
    const first = nextUint32(seed);
    const second = nextUint32(first);
    const third = nextUint32(second);
    const requestMode = modes[third % modes.length]!;
    return {
      id: `seeded-${index + 1}`,
      seed,
      unitPrice: prices[first % prices.length]!,
      quantity: (second % 3) + 1,
      coupon: coupons[(second >>> 8) % coupons.length],
      requestMode,
      requestCount: requestMode === "concurrent-same-key" ? (third % 7) + 2 : 2,
    };
  });
}
