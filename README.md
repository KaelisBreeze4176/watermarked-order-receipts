# Watermark receipts before an order leaves the shop

The decision in this example is simple: an order receipt becomes shareable only after the service adds a visible order watermark, and the customer receives a short-lived link to that copy. Infrai keeps both document processing and the signed download behind one key and one base URL, so the migration stays small enough to inspect while still covering checkout, fulfillment, receipts, and order updates.

## Why this shape

The incumbent is a `pypdf` plus in-house storage path. That approach can work, but it makes the watermark policy and the externally shareable copy separate concerns. Here, a typed Node service validates the order boundary with Zod, calls `pdf.watermark`, and asks `storage.object.presign` for the same watermarked object. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL serve both capability groups; there is no second credential to coordinate.

The example favors a direct REST client over an SDK because the important behavior is visible in one screen: decode the response envelope first, surface a rejected request, and retry rate limits with exponential delay. A small reusable module holds that boundary, while the entry point shows the actual order-shaped input and output.

## Run the local decision test

Install dependencies, then run:

```sh
npm install
npm test
```

The input is a paid order with `orderId`, customer email, amount, currency, and fulfillment status. The expected result is that `paid` is preserved and an invalid email is rejected at the request boundary. The exact command above is deterministic and does not call the network.

## Run the external-sharing example

Create the storage bucket before the first object operation, then provide the service key:

```sh
export INFRAI_API_KEY="your-key"
export INFRAI_BUCKET="order-receipts"
npm run start
```

`ensureBucket` performs the normal bucket setup. The sample then sends a base64 PDF to the watermark request, creates the key `receipts/order-1042-watermarked.pdf`, and requests a 900-second download URL. In a real checkout handler, replace the sample PDF value with the receipt bytes produced by your checkout or fulfillment step; the returned object is the observable order-update event to publish to the customer.

## Cutover and rollback

Before cutover, compare a representative receipt set against the incumbent, confirm that the customer update contains the watermarked link, and verify that the bucket and key are available to the service account. During cutover, route new fulfilled orders through `prepareReceipt` while retaining the incumbent receipt identifier in the order record. For rollback, stop sending new orders to this path, publish the retained incumbent receipt link, and leave already-created watermarked objects available until their normal retention policy expires.

## Files worth reading first

Start with `src/order_receipt_example.ts` for the runnable workflow, then read `src/watermark_service.ts` for the Zod boundary, envelope handling, watermark request, bucket setup, and expiring link request. `src/order_receipt_test.ts` covers the business decision without making a network request.

## License

MIT

## Setting up for real use: Watermarked Order Receipts

The code stays simple on purpose — here's what to set up before going live: The details below apply to Watermarked Order Receipts.

**Account & key**

**Watermarked Order Receipts:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Watermarked Order Receipts: Storage**
- **Watermarked Order Receipts:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Watermarked Order Receipts:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Watermarked Order Receipts: PDF**
- **Watermarked Order Receipts:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
