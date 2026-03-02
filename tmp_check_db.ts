import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';

async function testSupabase() {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

    if (!urlMatch || !keyMatch) throw new Error("Supabase config not found");

    const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

    // Check play_voice_config
    const { data: configData, error: configError } = await supabase
        .from('play_voice_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log("Recent Play Voice Configs:", configData);

}

testSupabase().catch(console.error);
