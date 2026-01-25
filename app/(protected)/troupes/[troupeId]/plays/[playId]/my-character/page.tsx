import { createClient } from "@/lib/supabase/server";
import { getPlayDetails } from "@/lib/actions/play";
import { MyCharacterClient } from "./my-character-client";
import { redirect } from "next/navigation";
import { ParsedScript } from "@/lib/types";

export default async function MyCharacterPage({
    params
}: {
    params: Promise<{ troupeId: string; playId: string }>;
}) {
    const { troupeId, playId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/troupes/${troupeId}/plays/${playId}`);

    // Get play details
    const play = await getPlayDetails(playId);
    if (!play) return <div>Pièce introuvable</div>;

    const script = play.script_content as ParsedScript;

    // Find user's character
    const myCharacter = play.play_characters?.find((c: any) => c.actor_id === user.id);
    if (!myCharacter) {
        redirect(`/troupes/${troupeId}/plays/${playId}`);
    }

    // Calculate character stats from script
    const characterName = myCharacter.name;
    const lineCount = script?.lines?.filter((l: any) =>
        l.type === 'dialogue' && l.character?.toLowerCase() === characterName.toLowerCase()
    ).length || 0;

    // Get scenes this character appears in
    const { data: characterScenes } = await supabase
        .from('scene_characters')
        .select('scene_id')
        .eq('character_id', myCharacter.id);
    const sceneCount = characterScenes?.length || 0;

    // Get feedbacks for this character (with type)
    const { data: feedbacks } = await supabase
        .from('rehearsal_feedbacks')
        .select(`
            id,
            text,
            type,
            created_at,
            event_id,
            events(id, title, start_time)
        `)
        .eq('character_id', myCharacter.id)
        .order('created_at', { ascending: false });

    // Get unique events for filter dropdown
    const uniqueEvents = feedbacks?.reduce((acc: any[], fb: any) => {
        if (fb.events && !acc.find(e => e.id === fb.events.id)) {
            acc.push(fb.events);
        }
        return acc;
    }, []) || [];

    // Extract script notes/indications for this character
    const scriptNotes = script?.lines?.filter((l: any) => {
        // Case 1: The "character" is an instruction targeting the user (e.g. "METTEUR EN SCÈNE [À ANNETTE]")
        // or simply a note line.
        // We check if the line contents target the character
        const textTarget = l.text?.toUpperCase().includes(`[À ${characterName.toUpperCase()}]`);

        // Case 2: It's a stage direction just for this character? (Harder to determine without precise linking)
        // For now, let's stick to the explicit [À NAME] pattern seen in the screenshot,
        // OR if the line character is "NOTE" and text targets user.
        return textTarget;
    }).map((l: any, idx: number) => ({
        id: `script-note-${idx}`,
        text: l.text,
        type: 'indication',
        created_at: new Date().toISOString(), // Current time as placeholder, or maybe 0?
        event_id: 'script',
        events: { id: 'script', title: 'Script Original', start_time: new Date().toISOString() }
    })) || [];

    // Combine database feedbacks and script notes
    const allFeedbacks = [...(feedbacks || []), ...scriptNotes].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Get rehearsal sessions for scene stats
    const { data: sessions } = await supabase
        .from('rehearsal_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('script_id', playId)
        .order('created_at', { ascending: false });

    // Get scene rehearsal counts
    const { data: playScenes } = await supabase
        .from('play_scenes')
        .select('id, title, scene_number')
        .eq('play_id', playId)
        .order('scene_number', { ascending: true });

    // Get line errors for this character
    const { getCharacterLineErrors } = await import("@/app/actions/stats");
    const lineErrors = await getCharacterLineErrors(playId, myCharacter.name);

    // Calculate aggregated stats
    const totalSessions = sessions?.length || 0;
    const totalMinutes = sessions?.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0) / 60 || 0;

    let totalLinesRehearsed = 0;
    let totalLinesFirstTry = 0;
    let totalLinesWrong = 0;
    let totalLinesSkipped = 0;

    sessions?.forEach((s: any) => {
        totalLinesRehearsed += (s.lines_rehearsed || 0);
        totalLinesFirstTry += (s.lines_validated_first_try || 0);
        totalLinesWrong += (s.lines_wrong || 0);
        totalLinesSkipped += (s.lines_skipped || 0);
    });

    const totalLinesValidated = totalLinesRehearsed - totalLinesSkipped;
    const totalAttempts = totalLinesFirstTry + totalLinesWrong + totalLinesSkipped; // Approximation of total "interactions" tracked
    // Or just use totalLinesRehearsed as denominator if we trust it matches
    const avgFirstTryRate = totalLinesValidated > 0
        ? Math.round((totalLinesFirstTry / totalLinesValidated) * 100)
        : 0;

    return (
        <MyCharacterClient
            troupeId={troupeId}
            playId={playId}
            playTitle={play.title}
            character={{
                ...myCharacter,
                lineCount,
                sceneCount
            }}
            feedbacks={allFeedbacks}
            uniqueEvents={uniqueEvents}
            scenes={playScenes || []}
            lineErrors={lineErrors}
            stats={{
                totalSessions,
                totalMinutes: Math.round(totalMinutes),
                avgFirstTryRate,
                totalLinesValidated,
                totalLinesSkipped,
                totalLinesWrong,
                recentSessions: sessions?.slice(0, 5) || []
            }}
        />
    );
}

