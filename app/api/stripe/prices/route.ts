import { NextResponse } from 'next/server';

// This endpoint returns Stripe price IDs to the client
// Server-side env vars are not accessible on the client, so we expose them here
export async function GET() {
    return NextResponse.json({
        solo_pro: process.env.STRIPE_SOLO_PRO_PRICE_ID || null,
        troupe: process.env.STRIPE_TROUPE_PRICE_ID || null,
    });
}
