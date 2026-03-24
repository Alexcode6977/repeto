import { ScriptRow } from "./script-row";
import { ScriptCard } from "./script-card";
import { ScriptGridEmptyState } from "./script-grid-empty-state";
import type { ScriptMetadata } from "@/lib/types";

interface ScriptGridDesktopProps {
    scripts: ScriptMetadata[];
    isLoading: boolean;
    userEmail: string | null;
    onLoad: (script: ScriptMetadata) => void;
    onRename: (id: string, newTitle: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onTogglePublic: (script: ScriptMetadata) => Promise<void>;
    onCancelVocalization: (scriptId: string) => Promise<void>;
    onImport: () => void;
    layoutMode: "grid" | "list";
    onShowStats: (script: ScriptMetadata) => void;
}

export function ScriptGridDesktop({
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
    onShowStats,
}: ScriptGridDesktopProps) {
    if (layoutMode === "list") {
        return (
            <div className="space-y-3 pb-32">
                {isLoading ? (
                    [1, 2, 3, 4].map((index) => (
                        <div key={index} className="h-20 w-full bg-card rounded-2xl skeleton-shimmer" />
                    ))
                ) : scripts.length > 0 ? (
                    scripts.map((script) => (
                        <ScriptRow
                            key={script.id}
                            script={script}
                            userEmail={userEmail}
                            onLoad={onLoad}
                            onDelete={onDelete}
                            onRename={onRename}
                            onTogglePublic={onTogglePublic}
                            onShowStats={onShowStats}
                        />
                    ))
                ) : (
                    <div className="py-12 text-center text-muted-foreground">
                        Aucun script trouvé.
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-0 mx-0 px-0">
            {isLoading ? (
                [1, 2, 3].map((index) => (
                    <div key={index} className="aspect-[4/5] bg-card rounded-[2rem] skeleton-shimmer" />
                ))
            ) : scripts.length > 0 ? (
                scripts.map((script, index) => (
                    <div key={script.id}>
                        <ScriptCard
                            script={script}
                            userEmail={userEmail}
                            index={index}
                            onLoad={onLoad}
                            onRename={onRename}
                            onDelete={onDelete}
                            onTogglePublic={onTogglePublic}
                            onCancelVocalization={onCancelVocalization}
                            onShowStats={onShowStats}
                        />
                    </div>
                ))
            ) : (
                <div className="col-span-full">
                    <ScriptGridEmptyState onImport={onImport} />
                </div>
            )}
        </div>
    );
}
