const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), ".env.local");
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, "utf-8");
            content.split("\n").forEach(line => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = match[2] || "";
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.warn("Could not load .env.local manually", e);
    }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportScript(search) {
    console.log(`Searching for script: "${search}"...`);

    const { data, error } = await supabase
        .from("scripts")
        .select("*")
        .ilike("title", `%${search}%`)
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Fetch error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No script found with that title.");
        return;
    }

    const script = data[0];
    const filename = `${script.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_parsed.json`;

    fs.writeFileSync(filename, JSON.stringify(script.content, null, 2));
    console.log(`✅ Script "${script.title}" exported to: ${filename}`);
}

const searchTerm = process.argv[2];
if (!searchTerm) {
    console.log("Usage: node export-script.js <script_title_or_part>");
    process.exit(1);
}

exportScript(searchTerm);
