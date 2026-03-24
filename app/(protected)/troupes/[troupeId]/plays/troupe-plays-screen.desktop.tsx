"use client";

import { DeletePlayButton } from "@/app/(protected)/troupes/[troupeId]/plays/delete-play-button";
import { PlayPosterCard } from "@/app/(protected)/troupes/[troupeId]/plays/play-poster-card";
import type { TroupePlaysScreenProps } from "@/app/(protected)/troupes/[troupeId]/plays/troupe-plays-screen.types";
import {
    TroupePlaysAddCard,
    TroupePlaysEmptyState,
    TroupePlaysImportWizard,
    TroupePlaysIntro,
} from "@/app/(protected)/troupes/[troupeId]/plays/troupe-plays-screen.shared";

export function TroupePlaysScreenDesktop(props: TroupePlaysScreenProps) {
    return (
        <div className="space-y-12">
            <TroupePlaysIntro />

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {props.plays.map((play, index: number) => (
                    <div key={play.id} className="relative group/wrapper">
                        {props.canManage ? (
                            <div className="absolute -top-2 -right-2 z-50 opacity-0 group-hover/wrapper:opacity-100 transition-opacity">
                                <DeletePlayButton playId={play.id} playTitle={play.title} />
                            </div>
                        ) : null}
                        <PlayPosterCard play={play} troupeId={props.troupeId} index={index} />
                    </div>
                ))}

                {props.canManage ? (
                    <TroupePlaysAddCard onOpenImportWizard={props.onOpenImportWizard} />
                ) : null}

                {props.plays.length === 0 ? (
                    <TroupePlaysEmptyState isAdmin={props.isAdmin} />
                ) : null}
            </div>

            <TroupePlaysImportWizard {...props} />
        </div>
    );
}
