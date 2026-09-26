/**
 * Domain models for the Jointly checkout scenario.
 *
 * Monetary values are stored as integer cents to avoid floating-point errors.
 * e.g. $10.00 => 1000
 */

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  /** Unit price in cents */
  unitPrice: number;
}

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export type OrderStatus = "open" | "finalized";

export interface LineItem {
  productId: string;
  productName: string;
  /** Unit price in cents at time of addition */
  unitPrice: number;
  quantity: number;
  /** Line total in cents (unitPrice * quantity) */
  lineTotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  lineItems: LineItem[];
  /** Sum of all line totals, in cents */
  subtotal: number;
  /** Tax amount in cents */
  tax: number;
  /** subtotal + tax, in cents */
  total: number;
  createdAt: string;
  finalizedAt?: string;
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export type PaymentStatus = "succeeded" | "failed";

export interface Payment {
  id: string;
  orderId: string;
  /** Amount charged in cents */
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}
