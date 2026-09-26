import type { FastifyInstance } from "fastify";
import type { OrderService } from "../services/order-service.js";
import type { CheckoutService } from "../services/checkout-service.js";
import type { PaymentService } from "../services/payment-service.js";
import type { CouponService } from "../services/coupon-service.js";
import type { CouponRepository } from "../repositories/interfaces.js";
import type { Product } from "../models.js";

interface AddItemBody {
  product: Product;
  quantity: number;
}

interface ApplyCouponBody {
  code: string;
}

export function registerRoutes(
  app: FastifyInstance,
  orderService: OrderService,
  checkoutService: CheckoutService,
  paymentService: PaymentService,
  couponService: CouponService,
  couponRepo: CouponRepository,
): void {
  // Seed a couple of well-known coupons for testing and demo purposes.
  couponRepo.save({ code: "SAVE10", discountPercent: 10 });
  couponRepo.save({ code: "SAVE20", discountPercent: 20 });

  // POST /orders — create a new empty order
  app.post("/orders", async (_req, reply) => {
    const order = orderService.createOrder();
    return reply.code(201).send(order);
  });

  // GET /orders/:id — read an order
  app.get<{ Params: { id: string } }>("/orders/:id", async (req, reply) => {
    try {
      const order = orderService.getOrder(req.params.id);
      return reply.send(order);
    } catch (err: unknown) {
      return reply.code(404).send({ error: (err as Error).message });
    }
  });

  // POST /orders/:id/items — add a product to an open order
  app.post<{ Params: { id: string }; Body: AddItemBody }>(
    "/orders/:id/items",
    async (req, reply) => {
      try {
        const order = orderService.addItem(
          req.params.id,
          req.body.product,
          req.body.quantity,
        );
        return reply.send(order);
      } catch (err: unknown) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  // POST /orders/:id/coupons — apply a coupon to an open order
  app.post<{ Params: { id: string }; Body: ApplyCouponBody }>(
    "/orders/:id/coupons",
    async (req, reply) => {
      try {
        const order = couponService.applyCoupon(req.params.id, req.body.code);
        return reply.send(order);
      } catch (err: unknown) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  // POST /orders/:id/checkout — finalize the order
  app.post<{ Params: { id: string } }>(
    "/orders/:id/checkout",
    async (req, reply) => {
      try {
        const order = checkoutService.finalizeOrder(req.params.id);
        return reply.send(order);
      } catch (err: unknown) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  // POST /payments — pay for a finalized order
  app.post<{ Body: { orderId: string } }>("/payments", async (req, reply) => {
    try {
      const payment = paymentService.pay(req.body.orderId);
      return reply.code(201).send(payment);
    } catch (err: unknown) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
