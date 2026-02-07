import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getBaseUrlFromRequest } from '@/lib/server/url';

/**
 * Solo Pro success handler - called after successful Stripe checkout.
 * Subscription sync is handled by the Stripe webhook.
 */
export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const baseUrl = getBaseUrlFromRequest(request);

    if (!sessionId) {
        return NextResponse.redirect(new URL('/pricing?error=missing_session', baseUrl));
    }

    try {
        // Validate session existence but do not mutate DB here.
        await stripe.checkout.sessions.retrieve(sessionId);

        return NextResponse.redirect(new URL('/profile?success=true', baseUrl));

    } catch (error: unknown) {
        console.error('[Stripe Success] Unexpected error:', error);
        return NextResponse.redirect(new URL('/pricing?error=unknown', baseUrl));
    }
}
