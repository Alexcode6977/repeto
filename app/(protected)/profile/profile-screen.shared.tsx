"use client";

import Link from "next/link";
import { AlertTriangle, BarChart2, Calendar, Check, ChevronDown, Crown, Edit2, Loader2, LogOut, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarSelector } from "@/components/avatar-selector";
import { SubscriptionCard } from "@/components/subscription-card";
import type { ProfileScreenProps } from "@/app/(protected)/profile/profile-screen.types";

const TIER_LABELS: Record<string, string> = {
    free: "Gratuit",
    solo_pro: "Solo Pro",
    troupe: "Troupe",
    troupe_xl: "Troupe XL",
};

export function ProfileScreenFrame({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="w-full max-w-4xl mx-auto pt-24 md:pt-32 space-y-6 md:space-y-8 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {children}
        </div>
    );
}

export function ProfileSuccessMessage({
    showSuccessMessage,
}: Pick<ProfileScreenProps, "showSuccessMessage">) {
    if (!showSuccessMessage) {
        return null;
    }

    return (
        <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 flex items-center gap-3">
            <Check className="w-5 h-5" />
            <p>Votre abonnement a été activé avec succès ! 🎉</p>
        </div>
    );
}

export function ProfileHeaderSection(props: ProfileScreenProps) {
    return (
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 pb-8 border-b border-border">
            <AvatarSelector
                currentAvatarUrl={props.avatarUrl}
                userId={props.user?.id}
                onAvatarChange={props.onAvatarChange}
            />
            <div className="text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2">
                    {props.isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={props.editedName}
                                onChange={(event) => props.onEditedNameChange(event.target.value)}
                                className="bg-muted border border-border rounded-xl px-3 md:px-4 py-2 text-xl md:text-2xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-36 md:w-48"
                                autoFocus
                                placeholder="Votre prénom"
                            />
                            <button
                                onClick={() => void props.onSaveFirstName()}
                                disabled={props.isSaving}
                                className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                            >
                                {props.isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={props.onCancelEditingName}
                                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl md:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/60">
                                {props.displayName}
                            </h1>
                            <button
                                onClick={props.onStartEditingName}
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
                    Membre depuis {props.user?.created_at ? new Date(props.user.created_at).getFullYear() : new Date().getFullYear()}
                </p>
            </div>
            <Button
                onClick={() => void props.onLogout()}
                className="md:ml-auto bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20"
            >
                <LogOut className="w-4 h-4 mr-2" />
                Se déconnecter
            </Button>
        </div>
    );
}

export function ProfilePersonalInfoCard({
    user,
}: Pick<ProfileScreenProps, "user">) {
    return (
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-card border border-border space-y-4">
            <h3 className="text-lg md:text-xl font-semibold text-foreground">Informations Personnelles</h3>
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Email</label>
                <div className="p-4 rounded-xl bg-muted border border-border text-foreground">
                    {user?.email || "Chargement..."}
                </div>
            </div>
        </div>
    );
}

export function ProfileStatsSection({
    subscriptionTier,
}: Pick<ProfileScreenProps, "subscriptionTier">) {
    if (!["solo_pro", "troupe", "troupe_xl"].includes(subscriptionTier)) {
        return null;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary" />
                Mes Statistiques
            </h2>
            <Link href="/stats">
                <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                            <BarChart2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                Voir mes statistiques
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Analysez votre temps de répétition et vos progrès
                            </p>
                        </div>
                    </div>
                    <div className="p-2 rounded-full bg-secondary text-muted-foreground group-hover:text-foreground transition-colors">
                        <ChevronDown className="w-5 h-5 -rotate-90" />
                    </div>
                </div>
            </Link>
        </div>
    );
}

export function ProfileMobileSubscriptionSection({
    subscriptionTier,
}: Pick<ProfileScreenProps, "subscriptionTier">) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Mon Abonnement
            </h2>
            <Link href="/profile/subscription" className="block">
                <div className="p-4 rounded-2xl bg-card border border-border hover:border-primary/30 active:scale-[0.98] transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${subscriptionTier === "free" ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>
                            <Crown className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground text-sm">
                                {TIER_LABELS[subscriptionTier] ?? subscriptionTier}
                            </p>
                            <p className="text-xs text-muted-foreground">Gérer mon abonnement</p>
                        </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground -rotate-90" />
                </div>
            </Link>
        </div>
    );
}

export function ProfileDesktopSubscriptionSection(props: ProfileScreenProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Mon Abonnement
            </h2>
            <SubscriptionCard
                tier={props.subscriptionTier}
                status={props.subscriptionStatus}
                endDate={props.subscriptionEndDate}
                cancelAtPeriodEnd={props.cancelAtPeriodEnd}
                hasStripeCustomer={!!props.stripeCustomerId}
                trialStartDate={props.user?.created_at}
            />
        </div>
    );
}

export function ProfileDangerZone({
    onOpenDeleteModal,
}: Pick<ProfileScreenProps, "onOpenDeleteModal">) {
    return (
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-red-500/5 border border-red-500/20 space-y-3 md:space-y-4">
            <h3 className="text-lg md:text-xl font-semibold text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Zone Dangereuse
            </h3>
            <p className="text-muted-foreground text-sm">
                La suppression de votre compte est irréversible. Toutes vos données seront définitivement effacées.
            </p>
            <Button
                onClick={onOpenDeleteModal}
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20"
            >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer mon compte
            </Button>
        </div>
    );
}

export function ProfileDeleteAccountModal(props: ProfileScreenProps) {
    if (!props.showDeleteModal) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl p-4 md:p-6 max-w-md w-full space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-3">
                    <div className="p-2 md:p-3 rounded-full bg-red-500/20">
                        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-foreground">Supprimer votre compte</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">Cette action est irréversible</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Êtes-vous sûr de vouloir supprimer votre compte ? Toutes vos données seront définitivement supprimées :
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Vos pièces et répétitions</li>
                        <li>Vos enregistrements audio</li>
                        <li>Vos retours et statistiques</li>
                        <li>Votre abonnement</li>
                    </ul>

                    <div className="space-y-2">
                        <label className="text-sm text-foreground font-medium">
                            Tapez <span className="font-bold text-red-500">SUPPRIMER</span> pour confirmer
                        </label>
                        <input
                            type="text"
                            value={props.deleteConfirmText}
                            onChange={(event) => props.onDeleteConfirmTextChange(event.target.value)}
                            placeholder="SUPPRIMER"
                            className="w-full p-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        />
                    </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-2 md:gap-3">
                    <Button
                        onClick={props.onCloseDeleteModal}
                        className="flex-1 bg-muted text-foreground hover:bg-muted/80 border border-border"
                        disabled={props.isDeleting}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={() => void props.onDeleteAccount()}
                        disabled={props.deleteConfirmText !== "SUPPRIMER" || props.isDeleting}
                        className="flex-1 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {props.isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Suppression...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Confirmer
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
