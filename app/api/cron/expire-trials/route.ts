import { NextResponse } from 'next/server';
import { expireTrials } from '@/lib/cron/expire-trials';

// This API route can be called by a cron service
// Or used for manual testing
// In production, use Supabase Edge Function + pg_cron instead

export async function GET(request: Request) {
    try {
        // Optional: Add authentication header check for security
        const authHeader = request.headers.get('authorization');
        const expectedToken = process.env.CRON_SECRET_TOKEN;

        if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const results = await expireTrials();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error: any) {
        console.error('[CRON API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
