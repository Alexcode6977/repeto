"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Clock, FileText, User as UserIcon, Calendar, Star, MessageSquare, ChevronDown, ChevronUp, Edit2, Check, X, Loader2, Crown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getFeedbackHistory, getFeedbackStats, FeedbackEntry } from "../dashboard/feedback-actions";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SubscriptionCard } from "@/components/subscription-card";
import { SubscriptionTier } from "@/lib/subscription";

export default function ProfilePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<any>(null);
    const [firstName, setFirstName] = useState<string>("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
    const [stats, setStats] = useState({ totalSessions: 0, averageRating: 0, totalDuration: 0 });
    const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

    // Subscription state
    const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
    const [subscriptionStatus, setSubscriptionStatus] = useState<string>('inactive');
    const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
    const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    useEffect(() => {
        // Check for success query param from Stripe checkout
        if (searchParams.get('success') === 'true') {
            setShowSuccessMessage(true);
            // Clear the URL params
            window.history.replaceState({}, '', '/profile');
            setTimeout(() => setShowSuccessMessage(false), 5000);
        }
    }, [searchParams]);

    useEffect(() => {
        const loadData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                // Load profile with first_name and subscription fields
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("first_name, subscription_tier, subscription_status, subscription_end_date, stripe_customer_id")
                    .eq("id", user.id)
                    .single();

                if (profile) {
                    if (profile.first_name) setFirstName(profile.first_name);
                    setSubscriptionTier((profile.subscription_tier as SubscriptionTier) || 'free');
                    setSubscriptionStatus(profile.subscription_status || 'inactive');
                    setSubscriptionEndDate(profile.subscription_end_date || null);
                    setStripeCustomerId(profile.stripe_customer_id || null);
                }
            }

            // Load feedback data
            const [history, statsData] = await Promise.all([
                getFeedbackHistory(),
                getFeedbackStats(),
            ]);
            setFeedbackHistory(history);
            setStats(statsData);
        };
        loadData();
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleSaveFirstName = async () => {
        if (!user || !editedName.trim()) return;
        setIsSaving(true);

        const supabase = createClient();
        const { error } = await supabase
            .from("profiles")
            .update({ first_name: editedName.trim() })
            .eq("id", user.id);

        if (!error) {
            setFirstName(editedName.trim());
            setIsEditingName(false);
        }
        setIsSaving(false);
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const displayName = firstName || user?.email?.split('@')[0] || "Artiste";

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">

            {/* Success Message */}
            {showSuccessMessage && (
                <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 flex items-center gap-3">
                    <Check className="w-5 h-5" />
                    <p>Votre abonnement a été activé avec succès ! 🎉</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 pb-8 border-b border-border">
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl ring-4 ring-border">
                    <UserIcon className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="text-center md:text-left space-y-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="bg-muted border border-border rounded-xl px-4 py-2 text-2xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
                                    autoFocus
                                    placeholder="Votre prénom"
                                />
                                <button
                                    onClick={handleSaveFirstName}
                                    disabled={isSaving}
                                    className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={() => setIsEditingName(false)}
                                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/60">
                                    {displayName}
                                </h1>
                                <button
                                    onClick={() => {
                                        setEditedName(firstName);
                                        setIsEditingName(true);
                                    }}
                                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                                    title="Modifier le prénom"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                        <Calendar className="w-4 h-4" />
                        Membre depuis {new Date().getFullYear()}
                    </p>
                </div>
                <Button
                    onClick={handleLogout}
                    className="md:ml-auto bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                </Button>
            </div>

            {/* Subscription Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Mon Abonnement
                </h2>
                <SubscriptionCard
                    tier={subscriptionTier}
                    status={subscriptionStatus}
                    endDate={subscriptionEndDate}
                    hasStripeCustomer={!!stripeCustomerId}
                />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Sessions Stat */}
                <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/20">
                        <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Sessions</p>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.totalSessions}
                        </p>
                    </div>
                </div>

                {/* Average Rating */}
                <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-yellow-500/20">
                        <Star className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Note Moyenne</p>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.averageRating > 0 ? `${stats.averageRating}/5` : "-"}
                        </p>
                    </div>
                </div>

                {/* Time Stat */}
                <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-indigo-500/20">
                        <Clock className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Temps Total</p>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.totalDuration > 0 ? formatDuration(stats.totalDuration) : "0m"}
                        </p>
                    </div>
                </div>

            </div>

            {/* Feedback History */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Mes Retours Beta
                </h2>

                {feedbackHistory.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-card border border-border text-center">
                        <p className="text-muted-foreground">Aucun retour pour le moment.</p>
                        <p className="text-muted-foreground/60 text-sm mt-2">Vos retours apparaîtront ici après chaque répétition.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {feedbackHistory.map((feedback) => (
                            <div
                                key={feedback.id}
                                className="p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all"
                            >
                                {/* Header Row */}
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedFeedback(expandedFeedback === feedback.id ? null : feedback.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={cn(
                                                        "w-4 h-4",
                                                        star <= feedback.rating
                                                            ? "fill-yellow-500 text-yellow-500"
                                                            : "text-muted-foreground/30"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-foreground font-bold">{feedback.script_title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {feedback.character_name} • {formatDate(feedback.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    {expandedFeedback === feedback.id ? (
                                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>

                                {/* Expanded Content */}
                                {expandedFeedback === feedback.id && (
                                    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in slide-in-from-top-2">
                                        {feedback.what_worked && (
                                            <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                                                <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <Check className="w-3 h-3" /> Points forts
                                                </p>
                                                <p className="text-sm text-foreground/80 leading-relaxed italic">"{feedback.what_worked}"</p>
                                            </div>
                                        )}
                                        {feedback.what_didnt_work && (
                                            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <X className="w-3 h-3" /> Difficultés
                                                </p>
                                                <p className="text-sm text-foreground/80 leading-relaxed italic">"{feedback.what_didnt_work}"</p>
                                            </div>
                                        )}
                                        {feedback.improvement_ideas && (
                                            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <Star className="w-3 h-3" /> Pistes pour la suite
                                                </p>
                                                <p className="text-sm text-foreground/80 leading-relaxed italic">"{feedback.improvement_ideas}"</p>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider text-right">
                                            Durée de session: {formatDuration(feedback.duration_seconds)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="p-6 rounded-3xl bg-card border border-border space-y-6">
                <h3 className="text-xl font-semibold text-foreground">Préférences</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-foreground font-medium">Thème de l'application</p>
                        <p className="text-sm text-muted-foreground">Choisissez entre le mode clair et sombre</p>
                    </div>
                    <ThemeSwitcher />
                </div>
            </div>

            {/* Personal Info */}
            <div className="p-6 rounded-3xl bg-card border border-border space-y-6">
                <h3 className="text-xl font-semibold text-foreground">Informations Personnelles</h3>
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase font-semibold">Email</label>
                    <div className="p-4 rounded-xl bg-muted border border-border text-foreground">
                        {user?.email || "Chargement..."}
                    </div>
                </div>
            </div>

        </div>
    );
}
