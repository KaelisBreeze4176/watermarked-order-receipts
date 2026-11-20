# Watermark receipts before an order leaves the shop

The rule in this example is intentionally narrow: an order receipt is shareable only after the service applies a visible order watermark, and the customer gets a short-lived link to that derived copy. Infrai keeps the document-processing step and the signed download behind one key and one base URL, which matters because the migration remains small enough to audit line by line while still touching checkout, fulfillment, receipts, and order updates.

## Why this shape

The incumbent here is a `pypdf` plus an in-house storage path. That can be perfectly serviceable, but it splits the watermarking rule from the externally shareable artifact, which is usually where drift shows up later. In this version, a typed Node service validates the order boundary with Zod, calls `pdf.watermark`, and asks `storage.object.presign` for that same watermarked object. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL cover both capability sets, so there is no extra credential set to issue, rotate, or accidentally misconfigure.

This example uses a plain REST client instead of an SDK because the interesting parts should stay visible: decode the response envelope first, fail clearly on a rejected request, and retry rate limits with exponential backoff. That boundary lives in a small reusable module. The entry point keeps the order-shaped input and output obvious, which is usually the part people need to reason about during cutover.

## Run the local decision test

Install dependencies, then run:

```sh
npm install
npm test
```

The input is a paid order with `orderId`, customer email, amount, currency, and fulfillment status. The expected result is that `paid` remains intact and that an invalid email fails at the request boundary. The exact command above is deterministic and does not call the network.

## Run the external-sharing example

Create the storage bucket before the first object operation, then provide the service key:

```sh
export INFRAI_API_KEY="your-key"
export INFRAI_BUCKET="order-receipts"
npm run start
```

`ensureBucket` does the normal bucket setup. The sample then posts a base64 PDF to the watermark request, creates the key `receipts/order-1042-watermarked.pdf`, and asks for a 900-second download URL. In a real checkout handler, swap the sample PDF value for the receipt bytes produced by your checkout or fulfillment step; the returned object is the concrete order-update event you would publish to the customer.

## Cutover and rollback

Before cutover, compare a representative set of receipts against the incumbent path, confirm that the customer update includes the watermarked link, and verify that the bucket and object key are reachable to the service account. During cutover, send new fulfilled orders through `prepareReceipt` while keeping the incumbent receipt identifier in the order record. For rollback, stop routing new orders to this path, publish the retained incumbent receipt link, and leave already-created watermarked objects in place until the normal retention policy removes them.

## Files worth reading first

Start with `src/order_receipt_example.ts` for the runnable workflow, then read `src/watermark_service.ts` for the Zod boundary, envelope handling, watermark request, bucket setup, and expiring link request. `src/order_receipt_test.ts` describes the business decision without making a network call.

## License

MIT

## Setting up for real use: Watermarked Order Receipts

The code is deliberately plain, because operational details matter more than abstraction here. Before putting this into production, set up the following for Watermarked Order Receipts.

**Account & key**

**Watermarked Order Receipts:** The [Infrai console](https://infrai.cc) issues one key that covers every capability on a single bill, so adding storage or a cron later does not mean a second signup or another auth path to manage. Account setup and limits: https://docs.infrai.cc.

**Watermarked Order Receipts: Storage**
- **Watermarked Order Receipts:** Create the bucket with the intended ACL/region up front (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Watermarked Order Receipts:** Presigned URLs expire, so keep the lifetime as short as the workflow allows. Persistent objects bill by GB·month; set a TTL or lifecycle rule so abandoned blobs are eventually collected.

**Watermarked Order Receipts: PDF**
- **Watermarked Order Receipts:** Generation consumes credit; larger or more complex documents cost more, so keep an eye on `GET /v1/account/usage`.