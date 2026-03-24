import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LiveNotesList } from "./live-notes-list";
import { LiveScriptViewer } from "./live-script-viewer";
import type {
    LiveSessionPlay,
    LiveSessionScene,
    SaveLiveRawNoteInput,
} from "@/lib/features/live-session/types";

interface LiveScreenDesktopProps {
    sessionId: string;
    scenes: LiveSessionScene[];
    currentSceneIdx: number;
    currentScene: LiveSessionScene | null;
    currentPlay: LiveSessionPlay | null;
    globalSceneIndex: number;
    isReadOnly: boolean;
    isFirstScene: boolean;
    isLastScene: boolean;
    notesRefreshKey: number;
    onSelectScene: (sceneIndex: number) => void;
    onPreviousScene: () => void;
    onNextScene: () => void;
    onSaveRawNote: (input: SaveLiveRawNoteInput) => Promise<void>;
}

export function LiveScreenDesktop({
    sessionId,
    scenes,
    currentSceneIdx,
    currentScene,
    currentPlay,
    globalSceneIndex,
    isReadOnly,
    isFirstScene,
    isLastScene,
    notesRefreshKey,
    onSelectScene,
    onPreviousScene,
    onNextScene,
    onSaveRawNote,
}: LiveScreenDesktopProps) {
    return (
        <div className="flex flex-col h-[calc(100dvh-theme(spacing.20))] bg-background overflow-hidden relative">
            <div className="h-14 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md overflow-x-auto overflow-y-hidden no-scrollbar flex items-center px-4 gap-2 z-20">
                {scenes.map((scene, index) => {
                    const isActive = index === currentSceneIdx;

                    return (
                        <button
                            key={`${scene.id || scene.title}-${index}`}
                            onClick={() => onSelectScene(index)}
                            className={cn(
                                "shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border border-primary scale-105"
                                    : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                            )}
                        >
                            <span className="opacity-50 mr-2">{index + 1}.</span>
                            {scene.title}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-hidden relative flex min-h-0">
                <div className="flex-[0.75] min-w-0 min-h-0 border-r border-border/10 flex flex-col">
                    <LiveScriptViewer
                        forceVariant="desktop"
                        sessionId={sessionId}
                        currentScene={currentScene}
                        play={currentPlay}
                        globalSceneIndex={globalSceneIndex}
                        isReadOnly={isReadOnly}
                        onSaveRawNote={onSaveRawNote}
                    />
                </div>

                <div className="flex-[0.25] min-w-0 bg-background flex flex-col border-l border-border/10">
                    <div className="flex items-center border-b border-border/50 bg-muted/20 px-4 h-12">
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary">
                            Flux de Notes
                        </span>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        {isReadOnly ? (
                            <div className="h-full flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                                Notes de direction non visibles en mode lecture seule.
                            </div>
                        ) : (
                            <LiveNotesList eventId={sessionId} refreshKey={notesRefreshKey} />
                        )}
                    </div>
                </div>
            </div>

            <div className="h-20 shrink-0 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-between px-6">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onPreviousScene}
                    disabled={isFirstScene}
                    className="h-12 w-12 rounded-full border-muted-foreground/20 hover:bg-muted"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Scène</span>
                    <span className="text-xl font-bold font-mono">
                        {currentSceneIdx + 1}
                        <span className="text-muted-foreground/40 text-sm">/{scenes.length}</span>
                    </span>
                </div>

                <Button
                    onClick={onNextScene}
                    disabled={isReadOnly && isLastScene}
                    className={cn(
                        "rounded-full transition-all shadow-lg h-12",
                        isLastScene
                            ? "px-6 bg-primary text-primary-foreground hover:bg-primary/90"
                            : "px-5 w-12 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                    )}
                >
                    {isLastScene ? (
                        <span className="flex items-center gap-2 font-bold text-sm">
                            Terminer
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 font-bold text-sm">
                            <ChevronRight className="w-5 h-5" />
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}
