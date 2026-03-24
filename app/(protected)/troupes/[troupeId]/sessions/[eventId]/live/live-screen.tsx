"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useLiveSessionScreen } from "@/lib/features/live-session/use-live-session-screen";
import type { LiveSessionViewModel } from "@/lib/features/live-session/types";
import { LiveScreenDesktop } from "./live-screen.desktop";
import { LiveScreenMobile } from "./live-screen.mobile";

interface LiveScreenProps {
    initialViewModel: LiveSessionViewModel;
}

export function LiveScreen({ initialViewModel }: LiveScreenProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { state, actions } = useLiveSessionScreen(initialViewModel);

    if (state.scenes.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Aucune scène au programme.</div>;
    }

    const rendererProps = {
        sessionId: state.sessionId,
        scenes: state.scenes,
        currentSceneIdx: state.currentSceneIdx,
        currentScene: state.currentScene,
        currentPlay: state.currentPlay,
        globalSceneIndex: state.globalSceneIndex,
        isReadOnly: state.isReadOnly,
        isFirstScene: state.isFirstScene,
        isLastScene: state.isLastScene,
        notesRefreshKey: state.notesRefreshKey,
        onSelectScene: actions.selectScene,
        onPreviousScene: actions.goToPreviousScene,
        onNextScene: actions.goToNextScene,
        onSaveRawNote: actions.saveRawNote,
    };

    return (
        <>
            {isDesktop ? (
                <LiveScreenDesktop {...rendererProps} />
            ) : (
                <LiveScreenMobile {...rendererProps} />
            )}

            <Dialog open={state.showFinishDialog} onOpenChange={actions.setShowFinishDialog}>
                <DialogContent className="max-md:fixed max-md:bottom-[calc(env(safe-area-inset-bottom)+var(--keyboard-offset,0px))] max-md:left-0 max-md:right-0 max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-t-3xl max-md:rounded-b-none max-md:p-0 max-md:max-h-[85vh] overflow-hidden">
                    <div className="flex flex-col max-h-[85vh]">
                        <div className="px-6 pt-6 pb-4">
                            <DialogHeader className="text-left">
                                <DialogTitle>Fin de la Séance</DialogTitle>
                                <DialogDescription>
                                    Vous allez clôturer cette séance et passer au traitement des notes.
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                        <div className="px-6 pb-6 flex-1 overflow-y-auto">
                            <div className="space-y-2">
                                <Label>Message de fin (Optionnel)</Label>
                                <Textarea
                                    placeholder="Un dernier mot pour l'équipe ou une note globale..."
                                    value={state.finalNotes}
                                    onChange={(event) => actions.setFinalNotes(event.target.value)}
                                />
                            </div>
                        </div>
                        <div className="px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+18px)] border-t border-border/40 bg-background/90 backdrop-blur-md">
                            <div className="flex flex-col gap-3">
                                <Button onClick={actions.finishSession} disabled={state.isFinishing} className="w-full">
                                    {state.isFinishing ? "Clôture..." : "Enregistrer et Clôturer"}
                                </Button>
                                <Button variant="outline" onClick={() => actions.setShowFinishDialog(false)} className="w-full">
                                    Annuler
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
