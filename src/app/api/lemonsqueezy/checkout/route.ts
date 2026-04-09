import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { reportError } from "@/lib/monitoring/report-error";

const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY!;
const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID!;

// Map plan IDs to LemonSqueezy variant IDs (set these after creating products in LS dashboard)
const PLAN_VARIANTS: Record<string, string> = {
  basic: process.env.LS_VARIANT_BASIC || "",
  standard: process.env.LS_VARIANT_STANDARD || "",
};

export async function POST(request: Request) {
  try {
    const { planId, designerEmail } = await request.json();

    // Always derive return URL from the request origin server-side. Never trust
    // a client-supplied returnUrl — that's an open-redirect vector.
    const origin = request.headers.get("origin");
    if (!origin) {
      return NextResponse.json({ error: "Missing origin" }, { status: 400 });
    }

    if (!planId || !designerEmail) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const variantId = PLAN_VARIANTS[planId];
    if (!variantId) {
      return NextResponse.json({ error: "Invalid plan or variant not configured" }, { status: 400 });
    }

    if (!LS_API_KEY || !LS_STORE_ID) {
      return NextResponse.json({ error: "LemonSqueezy not configured" }, { status: 500 });
    }

    // Verify the designerEmail corresponds to a real registered designer.
    // Without this check, an attacker could attribute payment metadata to any
    // arbitrary email and confuse downstream payout/notification logic.
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }
    const { data: designer } = await admin
      .from("profiles")
      .select("email")
      .eq("email", designerEmail)
      .maybeSingle();
    if (!designer) {
      return NextResponse.json({ error: "Unknown designer" }, { status: 400 });
    }

    // Use the authenticated user's email for the customer record. Falls back
    // to anonymous if not signed in (LemonSqueezy will collect at checkout).
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const customerEmail = user?.email;

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
              redirect_url: `${origin}?payment=success&plan=${planId}&designer=${encodeURIComponent(designerEmail)}`,
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
      reportError({
        route: "api/lemonsqueezy/checkout",
        error: new Error(`LemonSqueezy API ${res.status}: ${data?.errors?.[0]?.detail || "unknown"}`),
        context: { status: res.status, body: data },
      });
      return NextResponse.json(
        { error: data?.errors?.[0]?.detail || "Checkout creation failed" },
        { status: 500 }
      );
    }

    const checkoutUrl = data?.data?.attributes?.url;
    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    reportError({ route: "api/lemonsqueezy/checkout", error });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
