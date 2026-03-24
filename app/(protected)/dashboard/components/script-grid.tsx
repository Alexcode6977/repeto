import { useState } from "react";
import { PlayStatsDialog } from "@/components/play-stats-dialog";
import type {
    DashboardGridProps,
    DashboardViewportVariant,
} from "@/lib/features/dashboard/types";
import type { ScriptMetadata } from "@/lib/types";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { ScriptGridDesktop } from "./script-grid.desktop";
import { ScriptGridMobile } from "./script-grid.mobile";

interface ResponsiveScriptGridProps extends DashboardGridProps {
    forceVariant?: DashboardViewportVariant;
}

export function ScriptGrid({
    scripts,
    isLoading,
    userEmail,
    onLoad,
    onRename,
    onDelete,
    onTogglePublic,
    onCancelVocalization,
    onImport,
    layoutMode,
    forceVariant,
    activeIndex = 0,
    onIndexChange,
}: ResponsiveScriptGridProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const [statsScript, setStatsScript] = useState<ScriptMetadata | null>(null);

    const variant = forceVariant || (isDesktop ? "desktop" : "mobile");

    return (
        <>
            {variant === "desktop" ? (
                <ScriptGridDesktop
                    scripts={scripts}
                    isLoading={isLoading}
                    userEmail={userEmail}
                    onLoad={onLoad}
                    onRename={onRename}
                    onDelete={onDelete}
                    onTogglePublic={onTogglePublic}
                    onCancelVocalization={onCancelVocalization}
                    onImport={onImport}
                    layoutMode={layoutMode}
                    onShowStats={setStatsScript}
                />
            ) : (
                <ScriptGridMobile
                    scripts={scripts}
                    isLoading={isLoading}
                    userEmail={userEmail}
                    onLoad={onLoad}
                    onRename={onRename}
                    onDelete={onDelete}
                    onTogglePublic={onTogglePublic}
                    onCancelVocalization={onCancelVocalization}
                    onImport={onImport}
                    activeIndex={activeIndex}
                    onIndexChange={onIndexChange}
                    onShowStats={setStatsScript}
                />
            )}

            {statsScript ? (
                <PlayStatsDialog
                    playId={statsScript.id}
                    playTitle={statsScript.title}
                    isOpen={Boolean(statsScript)}
                    onOpenChange={(open) => !open && setStatsScript(null)}
                    showFullStatsLink
                />
            ) : null}
        </>
    );
}
