import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrlFromRequest } from '@/lib/server/url';
import { canManageTroupe } from '@/lib/utils/roles';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Vous devez être connecté.' },
                { status: 401 }
            );
        }

        let troupeId: string | undefined;
        try {
            const body = await request.json();
            troupeId = body?.troupeId;
        } catch {
            // Empty body is valid for personal portal usage.
        }

        const origin = getBaseUrlFromRequest(request);
        let customerId: string | null = null;
        let returnUrl = `${origin}/profile`;

        if (troupeId) {
            const [{ data: membership }, { data: troupe }] = await Promise.all([
                supabase
                    .from('troupe_members')
                    .select('roles')
                    .eq('troupe_id', troupeId)
                    .eq('user_id', user.id)
                    .maybeSingle(),
                supabase
                    .from('troupes')
                    .select('stripe_customer_id')
                    .eq('id', troupeId)
                    .maybeSingle(),
            ]);

            if (!canManageTroupe(membership?.roles)) {
                return NextResponse.json(
                    { error: 'Vous n’avez pas les droits pour gérer la facturation de cette troupe.' },
                    { status: 403 }
                );
            }

            customerId = troupe?.stripe_customer_id || null;
            returnUrl = `${origin}/troupes/${troupeId}/subscription`;
        } else {
            const { data: profile } = await supabase
                .from('profiles')
                .select('stripe_customer_id')
                .eq('id', user.id)
                .single();
            customerId = profile?.stripe_customer_id || null;
        }

        if (!customerId) {
            return NextResponse.json(
                { error: 'Aucun client Stripe lié pour ce contexte.' },
                { status: 400 }
            );
        }

        // Create Stripe Customer Portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de l\'accès au portail.';
        console.error('Stripe Portal Error:', error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
