import { NextResponse } from "next/server";
import crypto from "crypto";
import { reportError } from "@/lib/monitoring/report-error";

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = hmac.update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-signature") || "";

  if (WEBHOOK_SECRET && !verifySignature(body, signature)) {
    reportError({
      route: "api/lemonsqueezy/webhook",
      error: new Error("signature verification failed"),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(body);
    const eventName = event?.meta?.event_name;

    switch (eventName) {
      case "order_created": {
        const attrs = event.data?.attributes;
        const custom = event.meta?.custom_data;
        console.log("✅ LemonSqueezy payment completed:", {
          orderId: event.data?.id,
          planId: custom?.plan_id,
          designerEmail: custom?.designer_email,
          customerEmail: custom?.customer_email,
          total: attrs?.total_formatted,
          currency: attrs?.currency,
        });
        // TODO: Store payment record in Supabase DB
        // TODO: Send notification to designer
        break;
      }
      default:
        console.log("LemonSqueezy event:", eventName);
        break;
    }
  } catch (err) {
    reportError({ route: "api/lemonsqueezy/webhook", error: err });
    // LemonSqueezy will retry on 500
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
