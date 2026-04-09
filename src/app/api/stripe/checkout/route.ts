import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" });
}

const PLAN_PRICES: Record<string, number> = {
  basic: 900,    // $9.00 in cents
  standard: 1900, // $19.00 in cents
};

const PLATFORM_FEE_PERCENT = 20; // 20% commission

export async function POST(request: Request) {
  try {
    const { planId, designerEmail, designerStripeAccountId, customerEmail, returnUrl } =
      await request.json();

    if (!planId || !designerStripeAccountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const amount = PLAN_PRICES[planId];
    if (!amount) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const applicationFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Design Feedback — ${planId === "basic" ? "Basic" : "Standard"}`,
              description:
                planId === "basic"
                  ? "핵심 피드백 5개 · 48시간 내 응답"
                  : "상세 피드백 15개 · 24시간 내 응답 · 수정 제안 포함",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: designerStripeAccountId,
        },
      },
      customer_email: customerEmail || undefined,
      success_url: `${returnUrl}?payment=success&plan=${planId}&designer=${designerEmail}`,
      cancel_url: `${returnUrl}?payment=cancelled`,
      metadata: {
        planId,
        designerEmail,
        customerEmail: customerEmail || "",
        platform: "design-feedback",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
