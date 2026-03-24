"use client";

import type { CastingStudioViewProps } from "@/components/casting-studio.types";
import {
    CastingStudioCharacterRail,
    CastingStudioFooter,
    CastingStudioFrame,
    CastingStudioHeader,
    CastingStudioIntro,
    CastingStudioVoicePanel,
} from "@/components/casting-studio.shared";

export function CastingStudioDesktop(props: CastingStudioViewProps) {
    return (
        <CastingStudioFrame>
            <CastingStudioHeader onClose={props.onClose} />
            <CastingStudioIntro />

            <div className="flex flex-1 overflow-hidden">
                <div className="w-[30%] min-w-[320px] border-r border-border/40 dark:border-white/5 flex flex-col bg-muted/20 dark:bg-black/25 overflow-hidden">
                    <div className="p-4 border-b border-border/40 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-foreground/90 dark:text-white/90">Personnages</h3>
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                                {props.assignedCount}/{props.totalCount}
                            </span>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">Narrateur inclus. Sélectionnez un rôle pour affecter une voix.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <CastingStudioCharacterRail {...props} />
                    </div>
                </div>

                <CastingStudioVoicePanel {...props} />
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
