import { NextRequest, NextResponse } from 'next/server';
import { handleCheckoutSuccess } from '@/lib/actions/sync-subscription';

/**
 * Solo Pro success handler - called after successful Stripe checkout.
 * Syncs the subscription status and redirects to profile.
 */
export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.redirect(new URL('/pricing?error=missing_session', request.url));
    }

    try {
        const result = await handleCheckoutSuccess(sessionId);

        if (!result.success) {
            console.error('[Stripe Success] Error:', result.error);
            return NextResponse.redirect(new URL('/pricing?error=sync_failed', request.url));
        }

        // Redirect to profile with success message
        return NextResponse.redirect(new URL('/profile?success=true&tier=' + result.tier, request.url));

    } catch (error: any) {
        console.error('[Stripe Success] Unexpected error:', error);
        return NextResponse.redirect(new URL('/pricing?error=unknown', request.url));
    }
}
