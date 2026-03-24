import type { SubscriptionTier } from "@/lib/subscription";

export interface ProfileScreenProps {
    user: any;
    firstName: string;
    isEditingName: boolean;
    editedName: string;
    isSaving: boolean;
    avatarUrl: string | null;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: string;
    subscriptionEndDate: string | null;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
    showSuccessMessage: boolean;
    showDeleteModal: boolean;
    isDeleting: boolean;
    deleteConfirmText: string;
    displayName: string;
    onAvatarChange: (url: string | null) => void;
    onEditedNameChange: (value: string) => void;
    onStartEditingName: () => void;
    onCancelEditingName: () => void;
    onSaveFirstName: () => Promise<void>;
    onLogout: () => Promise<void>;
    onOpenDeleteModal: () => void;
    onCloseDeleteModal: () => void;
    onDeleteConfirmTextChange: (value: string) => void;
    onDeleteAccount: () => Promise<void>;
}
