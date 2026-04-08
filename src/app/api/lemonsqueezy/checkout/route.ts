import { NextResponse } from "next/server";

const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY!;
const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID!;

// Map plan IDs to LemonSqueezy variant IDs (set these after creating products in LS dashboard)
const PLAN_VARIANTS: Record<string, string> = {
  basic: process.env.LS_VARIANT_BASIC || "",
  standard: process.env.LS_VARIANT_STANDARD || "",
};

export async function POST(request: Request) {
  try {
    const { planId, designerEmail, customerEmail, returnUrl } =
      await request.json();

    if (!planId) {
      return NextResponse.json({ error: "Missing plan" }, { status: 400 });
    }

    const variantId = PLAN_VARIANTS[planId];
    if (!variantId) {
      return NextResponse.json({ error: "Invalid plan or variant not configured" }, { status: 400 });
    }

    if (!LS_API_KEY || !LS_STORE_ID) {
      return NextResponse.json({ error: "LemonSqueezy not configured" }, { status: 500 });
    }

    // Create checkout via LemonSqueezy API
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${LS_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: customerEmail || undefined,
              custom: {
                designer_email: designerEmail,
                customer_email: customerEmail || "",
                plan_id: planId,
              },
            },
            product_options: {
              redirect_url: `${returnUrl}?payment=success&plan=${planId}&designer=${designerEmail}`,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: LS_STORE_ID } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("LemonSqueezy error:", JSON.stringify(data));
      return NextResponse.json(
        { error: data?.errors?.[0]?.detail || "Checkout creation failed" },
        { status: 500 }
      );
    }

    const checkoutUrl = data?.data?.attributes?.url;
    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("LemonSqueezy Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
