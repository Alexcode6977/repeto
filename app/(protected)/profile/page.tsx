"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Clock, FileText, User as UserIcon, Calendar, Star, MessageSquare, ChevronDown, ChevronUp, Edit2, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFeedbackHistory, getFeedbackStats, FeedbackEntry } from "../dashboard/feedback-actions";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [firstName, setFirstName] = useState<string>("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
    const [stats, setStats] = useState({ totalSessions: 0, averageRating: 0, totalDuration: 0 });
    const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                // Load profile with first_name
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("first_name")
                    .eq("id", user.id)
                    .single();

                if (profile?.first_name) {
                    setFirstName(profile.first_name);
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

            {/* Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 pb-8 border-b border-white/10">
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl ring-4 ring-white/5">
                    <UserIcon className="w-10 h-10 text-white" />
                </div>
                <div className="text-center md:text-left space-y-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
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
                                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400">
                                    {displayName}
                                </h1>
                                <button
                                    onClick={() => {
                                        setEditedName(firstName);
                                        setIsEditingName(true);
                                    }}
                                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Sessions Stat */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/20">
                        <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Sessions</p>
                        <p className="text-2xl font-bold text-white">
                            {stats.totalSessions}
                        </p>
                    </div>
                </div>

                {/* Average Rating */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-yellow-500/20">
                        <Star className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Note Moyenne</p>
                        <p className="text-2xl font-bold text-white">
                            {stats.averageRating > 0 ? `${stats.averageRating}/5` : "-"}
                        </p>
                    </div>
                </div>

                {/* Time Stat */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/20">
                        <Clock className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Temps Total</p>
                        <p className="text-2xl font-bold text-white">
                            {stats.totalDuration > 0 ? formatDuration(stats.totalDuration) : "0m"}
                        </p>
                    </div>
                </div>

            </div>

            {/* Feedback History */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Mes Retours Beta
                </h2>

                {feedbackHistory.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <p className="text-gray-400">Aucun retour pour le moment.</p>
                        <p className="text-gray-500 text-sm mt-2">Vos retours apparaîtront ici après chaque répétition.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {feedbackHistory.map((feedback) => (
                            <div
                                key={feedback.id}
                                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
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
                                                            ? "fill-yellow-400 text-yellow-400"
                                                            : "text-gray-600"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{feedback.script_title}</p>
                                            <p className="text-xs text-gray-500">
                                                {feedback.character_name} • {formatDate(feedback.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    {expandedFeedback === feedback.id ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>

                                {/* Expanded Content */}
                                {expandedFeedback === feedback.id && (
                                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in slide-in-from-top-2">
                                        {feedback.what_worked && (
                                            <div>
                                                <p className="text-xs text-green-400 font-bold uppercase mb-1">✓ Ce qui a fonctionné</p>
                                                <p className="text-sm text-gray-300">{feedback.what_worked}</p>
                                            </div>
                                        )}
                                        {feedback.what_didnt_work && (
                                            <div>
                                                <p className="text-xs text-red-400 font-bold uppercase mb-1">✗ Ce qui n'a pas fonctionné</p>
                                                <p className="text-sm text-gray-300">{feedback.what_didnt_work}</p>
                                            </div>
                                        )}
                                        {feedback.improvement_ideas && (
                                            <div>
                                                <p className="text-xs text-blue-400 font-bold uppercase mb-1">💡 Idées d'amélioration</p>
                                                <p className="text-sm text-gray-300">{feedback.improvement_ideas}</p>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 pt-2">
                                            Durée de session: {formatDuration(feedback.duration_seconds)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Personal Info */}
            <div className="p-6 rounded-3xl bg-black/20 border border-white/5 space-y-6">
                <h3 className="text-xl font-semibold text-white">Informations Personnelles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-semibold">Email</label>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                            {user?.email || "Chargement..."}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-semibold">Plan</label>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-primary font-medium flex justify-between items-center">
                            Beta Testeur
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-full">Actif</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
