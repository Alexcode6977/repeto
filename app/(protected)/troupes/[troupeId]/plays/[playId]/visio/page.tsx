import { createClient } from "@/lib/supabase/server";
import { getTroupeMembers } from "@/lib/actions/troupe";
import { VisioRehearsalClient } from "./visio-rehearsal-client";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{
        troupeId: string;
        playId: string;
    }>;
}

export default async function VisioPage({ params }: PageProps) {
    const { troupeId, playId } = await params;
    const supabase = await createClient();

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // 2. Get Play Data
    const { data: play, error: playError } = await supabase
        .from("plays")
        .select(`
            *,
            play_scenes (
                *,
                scene_characters (*)
            ),
            play_characters (*)
        `)
        .eq("id", playId)
        .single();

    if (playError || !play) {
        console.error("Play not found", playError);
        return <div>Pièce introuvable</div>;
    }

    // DEBUG: Log play data on server
    console.log("[Visio Server] Play fetched:", {
        id: play.id,
        title: play.title,
        hasTextContent: !!play.text_content,
        textContentLength: play.text_content?.length || 0,
        textContentPreview: play.text_content?.substring(0, 300),
        charactersCount: play.play_characters?.length || 0
    });

    // 3. Get Members (for partner selection if needed in UI, though we might iterate on this)
    const members = await getTroupeMembers(troupeId);

    // 4. Parse Script (Simplified for now, we rely on RehearsalMode to do its own parsing or pass it here)
    // Actually RehearsalMode expects a `ParsedScript`. We usually parse it in the client or serve it.
    // For consistency with other pages, we'll pass the raw play data and let the client helper parse it 
    // OR we should parse it here.
    // Let's pass the raw play object to the client, which likely uses `useMemo` to parse it like `PlayDashboardClient` does.

    return (
        <VisioRehearsalClient
            troupeId={troupeId}
            play={play}
            userId={user.id}
            members={members}
        />
    );
}
