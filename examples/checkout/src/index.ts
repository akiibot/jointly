import Fastify from "fastify";
import { InMemoryOrderRepository } from "./repositories/in-memory/order-store.js";
import { InMemoryPaymentRepository } from "./repositories/in-memory/payment-store.js";
import { OrderService } from "./services/order-service.js";
import { CheckoutService } from "./services/checkout-service.js";
import { PaymentService } from "./services/payment-service.js";
import { registerRoutes } from "./api/routes.js";

export function buildApp() {
  const app = Fastify({ logger: false });

  const orderRepo = new InMemoryOrderRepository();
  const paymentRepo = new InMemoryPaymentRepository();

  const orderService = new OrderService(orderRepo);
  const checkoutService = new CheckoutService(orderRepo);
  const paymentService = new PaymentService(orderRepo, paymentRepo);

  registerRoutes(app, orderService, checkoutService, paymentService);

  return app;
}

// Only start listening when run directly (not imported in tests).
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3000);
  app.listen({ port, host: "127.0.0.1" }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Checkout server listening at ${address}`);
  });
}
