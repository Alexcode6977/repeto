"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileText, Download } from "lucide-react";
import { SubscriptionCard } from "@/components/subscription-card";
import { SubscriptionTier } from "@/lib/subscription";
import { getInvoices, Invoice, syncAndGetProfileSubscription } from "../actions";
import { createClient } from "@/lib/supabase/client";

export default function SubscriptionPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
    const [subscriptionStatus, setSubscriptionStatus] = useState<string>("inactive");
    const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
    const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const snapshot = await syncAndGetProfileSubscription();
                if (snapshot) {
                    setSubscriptionTier(snapshot.subscriptionTier || "free");
                    setSubscriptionStatus(snapshot.subscriptionStatus || "inactive");
                    setSubscriptionEndDate(snapshot.subscriptionEndDate || null);
                    setStripeCustomerId(snapshot.stripeCustomerId || null);
                    setCancelAtPeriodEnd(snapshot.cancelAtPeriodEnd || false);
                }
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadInvoices = async () => {
            const data = await getInvoices();
            setInvoices(data);
        };
        loadInvoices();
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto pt-24 md:pt-32 px-4 md:px-0 pb-20 space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Retour</span>
            </button>

            <h1 className="text-2xl font-bold text-foreground">Mon Abonnement</h1>

            <SubscriptionCard
                tier={subscriptionTier}
                status={subscriptionStatus}
                endDate={subscriptionEndDate}
                cancelAtPeriodEnd={cancelAtPeriodEnd}
                hasStripeCustomer={!!stripeCustomerId}
                trialStartDate={user?.created_at}
            />

            {invoices.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Historique de facturation
                    </h2>
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        <div className="divide-y divide-border">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground text-sm">
                                                {new Date(invoice.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                {invoice.number} • {(invoice.amount / 100).toLocaleString("fr-FR", { style: "currency", currency: invoice.currency })}
                                            </p>
                                        </div>
                                    </div>
                                    {invoice.pdf && (
                                        <a
                                            href={invoice.pdf}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                                            title="Télécharger la facture"
                                        >
                                            <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
