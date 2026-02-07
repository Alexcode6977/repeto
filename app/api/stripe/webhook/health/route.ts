import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { isPlatformAdminEmail } from '@/lib/auth/platform-admin';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase admin client is not configured');
    }

    return createServerClient(supabaseUrl, serviceRoleKey);
}

function parseHours(raw: string | null): number {
    const parsed = Number(raw ?? '24');
    if (!Number.isFinite(parsed)) return 24;
    if (parsed < 1) return 1;
    if (parsed > 168) return 168;
    return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const expectedToken = process.env.CRON_SECRET_TOKEN;
        const tokenAuthorized = !!expectedToken && authHeader === `Bearer ${expectedToken}`;

        if (!tokenAuthorized) {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !isPlatformAdminEmail(user.email)) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const hours = parseHours(request.nextUrl.searchParams.get('hours'));
        const since = new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString();
        const admin = getSupabaseAdmin();

        const [
            processedWindow,
            failuresWindow,
            latestProcessed,
            latestFailure,
        ] = await Promise.all([
            admin
                .from('stripe_webhook_events')
                .select('event_id', { count: 'exact', head: true })
                .gte('processed_at', since),
            admin
                .from('stripe_webhook_failures')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', since),
            admin
                .from('stripe_webhook_events')
                .select('event_id, event_type, processed_at')
                .order('processed_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            admin
                .from('stripe_webhook_failures')
                .select('id, event_id, event_type, error_message, created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

        const processedCount = processedWindow.count ?? 0;
        const failureCount = failuresWindow.count ?? 0;
        const latestFailureAt = latestFailure.data?.created_at ? new Date(latestFailure.data.created_at) : null;

        let status: 'ok' | 'degraded' | 'critical' = 'ok';
        if (failureCount > 0) status = 'degraded';
        if (latestFailureAt && (Date.now() - latestFailureAt.getTime()) <= (15 * 60 * 1000)) {
            status = 'critical';
        }
        if (processedCount === 0) {
            status = status === 'critical' ? 'critical' : 'degraded';
        }

        return NextResponse.json({
            status,
            windowHours: hours,
            since,
            metrics: {
                processedEvents: processedCount,
                failedEvents: failureCount,
                lastProcessedEvent: latestProcessed.data || null,
                lastFailure: latestFailure.data || null,
            },
            checkedAt: new Date().toISOString(),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
