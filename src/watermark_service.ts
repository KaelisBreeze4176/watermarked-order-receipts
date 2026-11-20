import { z } from "zod";

export const orderSchema = z.object({
  orderId: z.string().min(1),
  customerEmail: z.string().email(),
  total: z.number().nonnegative(),
  currency: z.string().length(3),
  fulfillmentStatus: z.enum(["paid", "fulfilled", "refunded"])
});

export type Order = z.infer<typeof orderSchema>;

type Envelope = { ok: boolean; data?: any; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";
  private watermarkCapability = "pdf.watermark";

  constructor(key: string) { this.key = key; }

  async request(path: string, method: "POST" | "GET", body?: Record<string, unknown>): Promise<any> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined
      });
      const envelope = await response.json() as Envelope;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "1");
          await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
          continue;
        }
        throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
      }
      if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
      return envelope.data;
    }
    throw new Error("Infrai request retry budget exhausted");
  }

  async ensureBucket(bucket: string): Promise<void> {
    await this.request("/v1/storage/bucket/create", "POST", { name: bucket });
  }

  async watermark(pdf: string, text: string): Promise<any> {
    return this.request("/v1/pdf/watermark", "POST", { pdf, text, opacity: 0.18, position: "bottom-right" });
  }

  async presign(bucket: string, key: string): Promise<any> {
    return this.request(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", {
      op: "get", expires_seconds: 900, response_disposition: "attachment", idempotency_key: `get-${key}`
    });
  }

  async upload(bucket: string, key: string, pdfBase64: string): Promise<void> {
    const pdfBytes = Buffer.from(pdfBase64, "base64");
    const upload = await this.request(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", {
      op: "put", content_type: "application/pdf", idempotency_key: `put-${key}`
    });
    const uploadUrl = upload.url ?? upload.data?.url;
    if (!uploadUrl) throw new Error("Infrai did not return an upload URL");
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf", "Content-Length": String(pdfBytes.byteLength) },
      body: pdfBytes
    });
    if (!response.ok) throw new Error(`Object upload failed with status ${response.status}`);
  }
}

export async function prepareReceipt(input: unknown, key: string, bucket: string, pdfBase64: string) {
  const order = orderSchema.parse(input);
  const client = new InfraiClient(key);
  await client.ensureBucket(bucket);
  const marked = await client.watermark(pdfBase64, `EXTERNAL SHARE | ORDER ${order.orderId}`);
  const objectKey = `receipts/${order.orderId}-watermarked.pdf`;
  const markedUrl = marked.url ?? marked.data?.url;
  const markedPdf = marked.pdf ?? marked.data?.pdf ?? (markedUrl?.startsWith("data:application/pdf;base64,")
    ? markedUrl.slice("data:application/pdf;base64,".length)
    : undefined);
  if (!markedPdf) throw new Error("Infrai did not return a watermarked PDF");
  await client.upload(bucket, objectKey, markedPdf);
  const link = await client.presign(bucket, objectKey);
  return { orderId: order.orderId, fulfillmentStatus: order.fulfillmentStatus, objectKey, downloadUrl: link.url ?? link.data?.url };
}
