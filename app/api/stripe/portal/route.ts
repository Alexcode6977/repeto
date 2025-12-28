import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

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

        // Get user's Stripe customer ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        if (!profile?.stripe_customer_id) {
            return NextResponse.json(
                { error: 'Aucun abonnement actif.' },
                { status: 400 }
            );
        }

        const origin = request.headers.get('origin') || 'http://localhost:3000';

        // Create Stripe Customer Portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${origin}/profile`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Portal Error:', error);
        return NextResponse.json(
            { error: error.message || 'Erreur lors de l\'accès au portail.' },
            { status: 500 }
        );
    }
}
