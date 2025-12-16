"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Clock, MessageSquare, Star, Filter, ChevronDown, ChevronUp, Save, Loader2, AlertCircle, Users, Crown, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllFeedback, updateFeedbackStatus, getFeedbackStats, isAdmin, getAllUsers, toggleUserPremium } from "./actions";

type FeedbackStatus = "pending" | "resolved" | "in_progress";

interface FeedbackEntry {
    id: string;
    script_title: string;
    character_name: string;
    rating: number;
    what_worked: string;
    what_didnt_work: string;
    improvement_ideas: string;
    duration_seconds: number;
    settings: Record<string, unknown>;
    status: string;
    resolved_at: string | null;
    admin_notes: string | null;
    created_at: string;
}

interface UserProfile {
    id: string;
    is_premium: boolean;
    created_at: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [stats, setStats] = useState<{ total: number; pending: number; resolved: number; avgRating: number; totalMinutes: number } | null>(null);
    const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"feedback" | "users">("feedback");
    const [togglingPremium, setTogglingPremium] = useState<string | null>(null);

    useEffect(() => {
        const checkAdmin = async () => {
            const admin = await isAdmin();
            setAuthorized(admin);
            if (admin) {
                const [feedbackData, statsData, usersData] = await Promise.all([
                    getAllFeedback(),
                    getFeedbackStats(),
                    getAllUsers(),
                ]);
                setFeedbacks(feedbackData);
                setStats(statsData);
                setUsers(usersData);
            }
            setLoading(false);
        };
        checkAdmin();
    }, []);

    const handleStatusChange = async (id: string, status: FeedbackStatus) => {
        setSaving(id);
        try {
            await updateFeedbackStatus(id, status, editingNotes?.id === id ? editingNotes.notes : undefined);
            setFeedbacks(prev => prev.map(f =>
                f.id === id
                    ? { ...f, status, resolved_at: status === "resolved" ? new Date().toISOString() : f.resolved_at }
                    : f
            ));
            if (editingNotes?.id === id) {
                setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, admin_notes: editingNotes.notes } : f));
            }
        } catch (e) {
            console.error(e);
        }
        setSaving(null);
    };

    const handleSaveNotes = async (id: string) => {
        if (!editingNotes || editingNotes.id !== id) return;
        setSaving(id);
        try {
            await updateFeedbackStatus(id, feedbacks.find(f => f.id === id)?.status as FeedbackStatus || "pending", editingNotes.notes);
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, admin_notes: editingNotes.notes } : f));
            setEditingNotes(null);
        } catch (e) {
            console.error(e);
        }
        setSaving(null);
    };

    const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
        setTogglingPremium(userId);
        try {
            await toggleUserPremium(userId, !currentStatus);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !currentStatus } : u));
        } catch (e) {
            console.error(e);
        }
        setTogglingPremium(null);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    const filteredFeedbacks = feedbacks.filter(f => {
        if (filter === "all") return true;
        if (filter === "pending") return !f.status || f.status === "pending" || f.status === "in_progress";
        if (filter === "resolved") return f.status === "resolved";
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <AlertCircle className="w-16 h-16 text-red-400" />
                <h1 className="text-2xl font-bold text-white">Accès refusé</h1>
                <p className="text-gray-400">Vous n'avez pas les droits admin.</p>
                <Button onClick={() => router.push("/dashboard")} variant="outline">
                    Retour au dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                        <p className="text-sm text-gray-400">Gérer l'application</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                <button
                    onClick={() => setActiveTab("feedback")}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                        activeTab === "feedback"
                            ? "bg-primary text-white"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                    )}
                >
                    <MessageSquare className="w-4 h-4" />
                    Feedbacks
                </button>
                <button
                    onClick={() => setActiveTab("users")}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                        activeTab === "users"
                            ? "bg-emerald-500 text-white"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                    )}
                >
                    <Users className="w-4 h-4" />
                    Utilisateurs ({users.length})
                </button>
            </div>

            {/* Feedback Tab Content */}
            {activeTab === "feedback" && (
                <>
                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase">Total</p>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                <p className="text-xs text-yellow-500 uppercase">En attente</p>
                                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-green-500 uppercase">Traités</p>
                                <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase">Note moy.</p>
                                <p className="text-2xl font-bold text-white">{stats.avgRating}/5</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-gray-500 uppercase">Minutes</p>
                                <p className="text-2xl font-bold text-white">{stats.totalMinutes}</p>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex gap-2">
                        <Button
                            variant={filter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("all")}
                        >
                            Tous
                        </Button>
                        <Button
                            variant={filter === "pending" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("pending")}
                            className={filter === "pending" ? "bg-yellow-500" : ""}
                        >
                            <Clock className="w-4 h-4 mr-1" /> En attente
                        </Button>
                        <Button
                            variant={filter === "resolved" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("resolved")}
                            className={filter === "resolved" ? "bg-green-500" : ""}
                        >
                            <CheckCircle className="w-4 h-4 mr-1" /> Traités
                        </Button>
                    </div>

                    {/* Feedback List */}
                    <div className="space-y-3">
                        {filteredFeedbacks.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Aucun feedback dans cette catégorie.
                            </div>
                        ) : (
                            filteredFeedbacks.map((feedback) => (
                                <div
                                    key={feedback.id}
                                    className={cn(
                                        "p-4 rounded-xl border transition-all",
                                        feedback.status === "resolved"
                                            ? "bg-green-500/5 border-green-500/20"
                                            : "bg-white/5 border-white/10"
                                    )}
                                >
                                    {/* Header Row */}
                                    <div
                                        className="flex items-start justify-between gap-4 cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === feedback.id ? null : feedback.id)}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Rating */}
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={cn(
                                                                "w-3 h-3",
                                                                star <= feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                                {/* Status Badge */}
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                                    feedback.status === "resolved" ? "bg-green-500/20 text-green-400" :
                                                        feedback.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                                                            "bg-yellow-500/20 text-yellow-400"
                                                )}>
                                                    {feedback.status === "resolved" ? "Traité" : feedback.status === "in_progress" ? "En cours" : "En attente"}
                                                </span>
                                                {/* Script & Character */}
                                                <span className="text-sm text-white font-medium">{feedback.script_title}</span>
                                                <span className="text-xs text-gray-500">({feedback.character_name})</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDate(feedback.created_at)} • {formatDuration(feedback.duration_seconds)}
                                            </p>
                                        </div>
                                        {expandedId === feedback.id ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>

                                    {/* Expanded Content */}
                                    {expandedId === feedback.id && (
                                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                                            {/* Feedback Content */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {feedback.what_worked && (
                                                    <div className="p-3 rounded-lg bg-green-500/10">
                                                        <p className="text-xs text-green-400 font-bold uppercase mb-1">✓ Ce qui a fonctionné</p>
                                                        <p className="text-sm text-gray-300">{feedback.what_worked}</p>
                                                    </div>
                                                )}
                                                {feedback.what_didnt_work && (
                                                    <div className="p-3 rounded-lg bg-red-500/10">
                                                        <p className="text-xs text-red-400 font-bold uppercase mb-1">✗ Problèmes</p>
                                                        <p className="text-sm text-gray-300">{feedback.what_didnt_work}</p>
                                                    </div>
                                                )}
                                                {feedback.improvement_ideas && (
                                                    <div className="p-3 rounded-lg bg-blue-500/10">
                                                        <p className="text-xs text-blue-400 font-bold uppercase mb-1">💡 Idées</p>
                                                        <p className="text-sm text-gray-300">{feedback.improvement_ideas}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Settings Used */}
                                            <div className="text-xs text-gray-600">
                                                Réglages: {JSON.stringify(feedback.settings)}
                                            </div>

                                            {/* Admin Notes */}
                                            <div>
                                                <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Notes admin</label>
                                                <textarea
                                                    value={editingNotes?.id === feedback.id ? editingNotes.notes : feedback.admin_notes || ""}
                                                    onChange={(e) => setEditingNotes({ id: feedback.id, notes: e.target.value })}
                                                    placeholder="Ajouter une note interne..."
                                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 resize-none"
                                                />
                                                {editingNotes?.id === feedback.id && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveNotes(feedback.id)}
                                                        disabled={saving === feedback.id}
                                                        className="mt-2"
                                                    >
                                                        {saving === feedback.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                                        Sauvegarder
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Status Actions */}
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    size="sm"
                                                    variant={feedback.status === "in_progress" ? "default" : "outline"}
                                                    onClick={() => handleStatusChange(feedback.id, "in_progress")}
                                                    disabled={saving === feedback.id}
                                                    className={feedback.status === "in_progress" ? "bg-blue-500" : ""}
                                                >
                                                    En cours
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={feedback.status === "resolved" ? "default" : "outline"}
                                                    onClick={() => handleStatusChange(feedback.id, "resolved")}
                                                    disabled={saving === feedback.id}
                                                    className={feedback.status === "resolved" ? "bg-green-500" : ""}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Marquer traité
                                                </Button>
                                                {feedback.status !== "pending" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleStatusChange(feedback.id, "pending")}
                                                        disabled={saving === feedback.id}
                                                    >
                                                        Réouvrir
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Users Tab Content */}
            {activeTab === "users" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">Gestion Premium</h2>
                        <p className="text-sm text-gray-400">
                            {users.filter(u => u.is_premium).length} utilisateurs premium
                        </p>
                    </div>

                    <div className="space-y-2">
                        {users.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Aucun utilisateur inscrit.
                            </div>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    className={cn(
                                        "p-4 rounded-xl border flex items-center justify-between",
                                        user.is_premium
                                            ? "bg-emerald-500/10 border-emerald-500/30"
                                            : "bg-white/5 border-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center",
                                            user.is_premium ? "bg-emerald-500/20" : "bg-white/10"
                                        )}>
                                            {user.is_premium ? (
                                                <Crown className="w-5 h-5 text-emerald-400" />
                                            ) : (
                                                <Users className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-mono text-white truncate max-w-[200px] md:max-w-none">
                                                {user.id.substring(0, 8)}...
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Inscrit le {formatDate(user.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleTogglePremium(user.id, user.is_premium)}
                                        disabled={togglingPremium === user.id}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                                            user.is_premium
                                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                                : "bg-white/10 text-gray-400 hover:bg-white/20"
                                        )}
                                    >
                                        {togglingPremium === user.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : user.is_premium ? (
                                            <ToggleRight className="w-5 h-5" />
                                        ) : (
                                            <ToggleLeft className="w-5 h-5" />
                                        )}
                                        {user.is_premium ? "Premium" : "Standard"}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
