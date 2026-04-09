import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("✅ Payment completed:", {
        planId: session.metadata?.planId,
        designerEmail: session.metadata?.designerEmail,
        customerEmail: session.metadata?.customerEmail,
        amount: session.amount_total,
      });
      // TODO: Store payment record in Supabase DB
      // TODO: Send notification to designer
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      console.log("🔄 Stripe account updated:", account.id, {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
      break;
    }
    default:
      // Unhandled event type
      break;
  }

  return NextResponse.json({ received: true });
}
