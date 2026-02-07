import { NextResponse } from 'next/server';
import { expireTrials } from '@/lib/cron/expire-trials';

// This API route can be called by a cron service
// Or used for manual testing
// In production, use Supabase Edge Function + pg_cron instead

export async function GET(request: Request) {
    try {
        // Require a token in production to avoid exposing cron execution.
        const authHeader = request.headers.get('authorization');
        const expectedToken = process.env.CRON_SECRET_TOKEN;
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction && !expectedToken) {
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const results = await expireTrials();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[CRON API] Error:', error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
