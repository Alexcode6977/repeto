const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAudio() {
    const { data: scripts, error } = await supabase
        .from('scripts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    console.log("Erreur éventuelle:", error);
    console.log("Derniers scripts:", scripts);

    const { data: recentFiles, error: storageError } = await supabase
        .storage
        .from('audio_cache')
        .list('', {
            limit: 10,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (recentFiles) {
        console.log(`\nDerniers dossiers/fichiers dans audio_cache :`, recentFiles.slice(0, 10).map(f => f.name));
    } else {
        console.log("Erreur de stockage:", storageError);
    }
}

checkAudio();
