import { getTroupeDetails, getTroupeSettingsData } from "@/lib/actions/troupe";
import { canManageTroupe } from "@/lib/utils/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { TroupeSubscriptionManager } from "@/components/troupe-subscription-manager";

export default async function SubscriptionPage({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);

    // Only Admin/Adjoint can manage subscription
    if (!troupe || !canManageTroupe(troupe.my_roles)) {
        redirect(`/troupes/${troupeId}`);
    }

    const settingsData = await getTroupeSettingsData(troupeId);

    return (
        <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="space-y-4">
                <Link
                    href={`/troupes/${troupeId}`}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Retour au tableau de bord
                </Link>

                <div>
                    <h1 className="text-3xl font-black tracking-tight">Abonnement & Facturation</h1>
                    <p className="text-muted-foreground mt-1">
                        Gérez votre abonnement et vos informations de paiement.
                    </p>
                </div>
            </div>

            {/* Subscription Manager */}
            <TroupeSubscriptionManager
                subscription={settingsData?.subscription || {
                    currentCount: 0,
                    memberLimit: 0,
                    plan: 'Free',
                    hasStripeCustomerId: false
                }}
                troupeId={troupeId}
            />
        </div>
    );
}
