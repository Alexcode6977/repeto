"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionTier } from "@/lib/subscription";
import { deleteAccount, syncAndGetProfileSubscription } from "@/app/(protected)/profile/actions";
import type { ProfileScreenProps } from "@/app/(protected)/profile/profile-screen.types";

export function useProfileScreen(): ProfileScreenProps {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<any>(null);
    const [firstName, setFirstName] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
    const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
    const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
    const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    useEffect(() => {
        if (searchParams.get("success") === "true") {
            setShowSuccessMessage(true);
            window.history.replaceState({}, "", "/profile");
            window.setTimeout(() => setShowSuccessMessage(false), 5000);
        }
    }, [searchParams]);

    useEffect(() => {
        const loadData = async () => {
            const supabase = createClient();
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            if (!currentUser) {
                return;
            }

            const snapshot = await syncAndGetProfileSubscription();
            if (!snapshot) {
                return;
            }

            if (snapshot.firstName) {
                setFirstName(snapshot.firstName);
            }

            setSubscriptionTier(snapshot.subscriptionTier || "free");
            setSubscriptionStatus(snapshot.subscriptionStatus || "inactive");
            setSubscriptionEndDate(snapshot.subscriptionEndDate || null);
            setAvatarUrl(snapshot.avatarUrl || null);
            setStripeCustomerId(snapshot.stripeCustomerId || null);
            setCancelAtPeriodEnd(snapshot.cancelAtPeriodEnd || false);
        };

        void loadData();
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleSaveFirstName = async () => {
        if (!user || !editedName.trim()) {
            return;
        }

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

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "SUPPRIMER") {
            return;
        }

        setIsDeleting(true);
        const result = await deleteAccount();

        if (result.success) {
            router.push("/login?message=" + encodeURIComponent("Votre compte a été supprimé avec succès."));
            return;
        }

        alert(result.error || "Erreur lors de la suppression");
        setIsDeleting(false);
    };

    const displayName = firstName || user?.email?.split("@")[0] || "Artiste";

    return {
        user,
        firstName,
        isEditingName,
        editedName,
        isSaving,
        avatarUrl,
        subscriptionTier,
        subscriptionStatus,
        subscriptionEndDate,
        cancelAtPeriodEnd,
        stripeCustomerId,
        showSuccessMessage,
        showDeleteModal,
        isDeleting,
        deleteConfirmText,
        displayName,
        onAvatarChange: setAvatarUrl,
        onEditedNameChange: setEditedName,
        onStartEditingName: () => {
            setEditedName(firstName);
            setIsEditingName(true);
        },
        onCancelEditingName: () => setIsEditingName(false),
        onSaveFirstName: handleSaveFirstName,
        onLogout: handleLogout,
        onOpenDeleteModal: () => setShowDeleteModal(true),
        onCloseDeleteModal: () => {
            setShowDeleteModal(false);
            setDeleteConfirmText("");
        },
        onDeleteConfirmTextChange: setDeleteConfirmText,
        onDeleteAccount: handleDeleteAccount,
    };
}
