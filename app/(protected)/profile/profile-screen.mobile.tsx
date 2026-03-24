"use client";

import type { ProfileScreenProps } from "@/app/(protected)/profile/profile-screen.types";
import {
    ProfileDangerZone,
    ProfileDeleteAccountModal,
    ProfileHeaderSection,
    ProfileMobileSubscriptionSection,
    ProfilePersonalInfoCard,
    ProfileScreenFrame,
    ProfileSuccessMessage,
} from "@/app/(protected)/profile/profile-screen.shared";

export function ProfileScreenMobile(props: ProfileScreenProps) {
    return (
        <ProfileScreenFrame>
            <ProfileSuccessMessage showSuccessMessage={props.showSuccessMessage} />
            <ProfileHeaderSection {...props} />
            <ProfilePersonalInfoCard user={props.user} />
            <ProfileMobileSubscriptionSection subscriptionTier={props.subscriptionTier} />
            <ProfileDangerZone onOpenDeleteModal={props.onOpenDeleteModal} />
            <ProfileDeleteAccountModal {...props} />
        </ProfileScreenFrame>
    );
}
