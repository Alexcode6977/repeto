import { NextResponse } from 'next/server';

// This endpoint returns Stripe price IDs to the client
// Server-side env vars are not accessible on the client, so we expose them here
export async function GET() {
    return NextResponse.json({
        solo_pro_monthly: process.env.STRIPE_SOLO_PRO_PRICE_ID || null,
        solo_pro_yearly: process.env.STRIPE_SOLO_PRO_PRICE_ID_Yearly || null,
        troupe_monthly: process.env.STRIPE_TROUPE_PRICE_ID || null,
        troupe_yearly: process.env.STRIPE_TROUPE_YEARLY_PRICE_ID || null,
        troupe_xl_monthly: process.env.STRIPE_TROUPE_XL_PRICE_ID || null,
        troupe_xl_yearly: process.env.STRIPE_TROUPE_XL_YEARLY_PRICE_ID || null,
        // Legacy fallbacks
        solo_pro: process.env.STRIPE_SOLO_PRO_PRICE_ID || null,
        troupe: process.env.STRIPE_TROUPE_PRICE_ID || null,
    });
}

