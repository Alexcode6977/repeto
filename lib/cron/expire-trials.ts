import { createClient } from '@/lib/supabase/server';

/**
 * Expire trials and clean up inactive troupes
 * This function should be called daily via Supabase Edge Function + pg_cron
 */
export async function expireTrials() {
    const supabase = await createClient();
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const results = {
        expiredUserTrials: 0,
        expiredTroupeTrials: 0,
        deletedTroupes: 0,
        errors: [] as string[]
    };

    try {
        // 1. Expire user trials (14 days)
        const { data: expiredUsers, error: userError } = await supabase
            .from('profiles')
            .update({
                subscription_tier: 'free',
                subscription_status: 'inactive'
            })
            .eq('subscription_status', 'trialing')
            .lte('trial_end_date', now.toISOString())
            .select();

        if (userError) {
            results.errors.push(`User trial expiration error: ${userError.message}`);
        } else {
            results.expiredUserTrials = expiredUsers?.length || 0;
        }

        // 2. Expire troupe trials (30 days) - mark as inactive with timestamp
        const { data: expiredTroupes, error: troupeError } = await supabase
            .from('troupes')
            .update({
                subscription_status: 'inactive',
                inactivated_at: now.toISOString()
            })
            .eq('subscription_status', 'trialing')
            .lte('trial_end_date', now.toISOString())
            .select();

        if (troupeError) {
            results.errors.push(`Troupe trial expiration error: ${troupeError.message}`);
        } else {
            results.expiredTroupeTrials = expiredTroupes?.length || 0;
        }

        // 3. Delete troupes that have been inactive for more than 6 months
        const { data: deletedTroupesList, error: deleteError } = await supabase
            .from('troupes')
            .delete()
            .eq('subscription_status', 'inactive')
            .lte('inactivated_at', sixMonthsAgo.toISOString())
            .select();

        if (deleteError) {
            results.errors.push(`Troupe deletion error: ${deleteError.message}`);
        } else {
            results.deletedTroupes = deletedTroupesList?.length || 0;
        }

    } catch (error: any) {
        results.errors.push(`Unexpected error: ${error.message}`);
    }

    console.log('[CRON] Trial expiration results:', results);
    return results;
}
