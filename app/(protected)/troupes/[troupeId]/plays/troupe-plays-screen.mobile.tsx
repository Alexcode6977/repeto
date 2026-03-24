"use client";

import { PlaysCarousel } from "@/app/(protected)/troupes/[troupeId]/plays/plays-carousel";
import type { TroupePlaysScreenProps } from "@/app/(protected)/troupes/[troupeId]/plays/troupe-plays-screen.types";
import {
    TroupePlaysEmptyState,
    TroupePlaysImportWizard,
    TroupePlaysIntro,
    TroupePlaysToolbar,
} from "@/app/(protected)/troupes/[troupeId]/plays/troupe-plays-screen.shared";

export function TroupePlaysScreenMobile(props: TroupePlaysScreenProps) {
    return (
        <div className="space-y-8">
            <TroupePlaysIntro />
            <div className="space-y-4">
                <TroupePlaysToolbar
                    canManage={props.canManage}
                    onOpenImportWizard={props.onOpenImportWizard}
                />
                <PlaysCarousel
                    plays={props.plays}
                    troupeId={props.troupeId}
                    isAdmin={props.canManage}
                    onAddPlay={props.onOpenImportWizard}
                />
                {props.plays.length === 0 ? (
                    <TroupePlaysEmptyState isAdmin={props.isAdmin} />
                ) : null}
            </div>
            <TroupePlaysImportWizard {...props} />
        </div>
    );
}
