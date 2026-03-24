"use client";

import type { CastingStudioViewProps } from "@/components/casting-studio.types";
import {
    CastingStudioCharacterList,
    CastingStudioFooter,
    CastingStudioFrame,
    CastingStudioHeader,
    CastingStudioIntro,
    CastingStudioTabs,
    CastingStudioVoicePanel,
} from "@/components/casting-studio.shared";

export function CastingStudioMobile(props: CastingStudioViewProps) {
    return (
        <CastingStudioFrame>
            <CastingStudioHeader onClose={props.onClose} />
            <CastingStudioIntro />
            <CastingStudioTabs
                activeTab={props.activeTab}
                assignedCount={props.assignedCount}
                totalCount={props.totalCount}
                onSetActiveTab={props.onSetActiveTab}
            />

            <div className="flex-1 overflow-hidden">
                {props.activeTab === "characters" ? (
                    <div className="h-full overflow-y-auto p-4 bg-muted/20 dark:bg-black/25">
                        <CastingStudioCharacterList {...props} />
                    </div>
                ) : (
                    <CastingStudioVoicePanel {...props} />
                )}
            </div>

            <CastingStudioFooter
                remainingCount={props.remainingCount}
                assignedCount={props.assignedCount}
                totalCount={props.totalCount}
                onClose={props.onClose}
                onSave={props.onSave}
            />
        </CastingStudioFrame>
    );
}
