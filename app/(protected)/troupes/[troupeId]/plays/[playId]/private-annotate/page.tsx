import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ParsedScript } from '@/lib/types';
import { PrivateAnnotatorClient } from './private-annotator-client';
import { getPrivateNotes } from '@/lib/actions/private-notes';

export default async function PrivateAnnotatePage({
    params
}: {
    params: Promise<{ troupeId: string; playId: string }>
}) {
    const { troupeId, playId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth');

    // Fetch Play
    const { data: play } = await supabase
        .from('plays')
        .select('*')
        .eq('id', playId)
        .single();

    if (!play) redirect(`/troupes/${troupeId}`);

    const script = play.script_content as ParsedScript;
    const privateNotes = await getPrivateNotes(playId);

    return (
        <PrivateAnnotatorClient
            play={play}
            script={script}
            privateNotes={privateNotes}
        />
    );
}
