"use client";

import type { ProfileScreenProps } from "@/app/(protected)/profile/profile-screen.types";
import {
    ProfileDangerZone,
    ProfileDeleteAccountModal,
    ProfileDesktopSubscriptionSection,
    ProfileHeaderSection,
    ProfilePersonalInfoCard,
    ProfileScreenFrame,
    ProfileStatsSection,
    ProfileSuccessMessage,
} from "@/app/(protected)/profile/profile-screen.shared";

export function ProfileScreenDesktop(props: ProfileScreenProps) {
    return (
        <ProfileScreenFrame>
            <ProfileSuccessMessage showSuccessMessage={props.showSuccessMessage} />
            <ProfileHeaderSection {...props} />
            <ProfilePersonalInfoCard user={props.user} />
            <ProfileStatsSection subscriptionTier={props.subscriptionTier} />
            <ProfileDesktopSubscriptionSection {...props} />
            <ProfileDangerZone onOpenDeleteModal={props.onOpenDeleteModal} />
            <ProfileDeleteAccountModal {...props} />
        </ProfileScreenFrame>
    );
}
