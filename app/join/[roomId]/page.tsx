import { Suspense } from "react";
import { JoinClient } from "./join-client";

interface JoinPageProps {
    params: Promise<{ roomId: string }>;
    searchParams: Promise<{ play?: string; name?: string }>;
}

export default async function JoinPage({ params, searchParams }: JoinPageProps) {
    const { roomId } = await params;
    const { play: playId, name } = await searchParams;

    // Fetch play data if playId is provided (for script sync)
    let playData = null;
    if (playId) {
        // We'll fetch from a public endpoint or pass minimal data
        // For now, the script will be synced via LiveKit DataTrack
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Connexion en cours...</p>
                </div>
            </div>
        }>
            <JoinClient roomId={roomId} playId={playId} initialName={name} />
        </Suspense>
    );
}
