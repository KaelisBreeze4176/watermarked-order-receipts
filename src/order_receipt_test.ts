import assert from "node:assert/strict";
import { orderSchema } from "./watermark_service.ts";

const parsed = orderSchema.parse({
  orderId: "order-7",
  customerEmail: "customer@example.com",
  total: 42,
  currency: "USD",
  fulfillmentStatus: "paid"
});

assert.equal(parsed.fulfillmentStatus, "paid");
assert.throws(() => orderSchema.parse({ ...parsed, customerEmail: "not-an-email" }));
console.log("order boundary test passed: paid orders retain their status and invalid email input is rejected");
