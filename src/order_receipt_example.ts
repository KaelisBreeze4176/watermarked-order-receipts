import { prepareReceipt } from "./watermark_service.ts";

const key = process.env.INFRAI_API_KEY;
const bucket = process.env.INFRAI_BUCKET ?? "order-receipts";
const pdfBase64 = process.env.INFRAI_PDF_BASE64 ?? "JVBERi0xLjEKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUiBdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5MiBdID4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2NyAwMDAwMCBuIAowMDAwMDAwMTIyIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1Jvb3QgMSAwIFIgL1NpemUgNCA+PgpzdGFydHhyZWYKMjE1CiUlRU9G";

if (!key) throw new Error("Set INFRAI_API_KEY before running the example");

const result = await prepareReceipt({
  orderId: "order-1042",
  customerEmail: "buyer@example.com",
  total: 129.5,
  currency: "USD",
  fulfillmentStatus: "fulfilled"
}, key, bucket, pdfBase64);

console.log(JSON.stringify({ message: "watermarked receipt ready", ...result }, null, 2));
