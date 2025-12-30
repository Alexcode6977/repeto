import { getPlayDetails } from "@/lib/actions/play";
import { createClient } from "@/lib/supabase/server";
import { RecordingManager } from "@/components/recording-manager";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ParsedScript } from "@/lib/types";
import { Mic } from "lucide-react";

export default async function RecordPage({
    params
}: {
    params: Promise<{ troupeId: string; playId: string }>;
}) {
    const { troupeId, playId } = await params;
    const play = await getPlayDetails(playId);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!play || !user) {
        redirect(`/troupes/${troupeId}/plays`);
    }

    const userId = user.id;
    const userChar = play.play_characters?.find((c: any) => c.actor_id === userId);

    if (!userChar) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <h1 className="text-2xl font-bold">Accès refusé</h1>
                <p>Vous n'avez pas de rôle attribué dans cette pièce.</p>
                <Link href={`/troupes/${troupeId}/plays/${playId}`}>
                    <Button>Retour au tableau de bord</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container max-w-[1400px] mx-auto py-8 animate-in fade-in duration-500">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 mb-8">
                <Link href={`/troupes/${troupeId}/plays/${playId}`}>
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                        ← Retour au tableau de bord
                    </Button>
                </Link>
            </div>

            {/* Title Section */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center shadow-inner">
                    <Mic className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        Studio d'Enregistrement
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        {play.title} • Rôle : <span className="text-primary">{userChar.name}</span>
                    </p>
                </div>
            </div>

            {/* Recorder Interface */}
            <RecordingManager
                script={play.script_content as ParsedScript}
                userCharacter={userChar.name}
                playId={play.id}
                userId={userId}
            />
        </div>
    );
}
