"use server";

import { parseScript } from "@/lib/parser";
import { ParsedScript } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// pdf-parse required inside action

export async function saveScript(script: ParsedScript) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("scripts")
        .insert({
            user_id: user.id,
            title: script.title || "Untitled Script",
            content: script,
        });

    if (error) {
        console.error("Error saving script:", error);
        throw new Error("Failed to save script");
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
}

export async function getScripts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching scripts:", error);
        return [];
    }

    // Map DB result to a LIGHTWEIGHT structure for the dashboard list
    // We compute stats here on the server and do NOT send the heavy 'content' to the client
    return data.map((row) => ({
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        characterCount: row.content?.characters?.length || 0,
        lineCount: row.content?.lines?.length || 0,
    }));
}

export async function getScriptById(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (error || !data) {
        console.error("Error fetching script detail:", error);
        return null;
    }

    return {
        id: data.id,
        title: data.title,
        ...data.content, // Spread the stored ParsedScript content to reconstruct full object
        created_at: data.created_at
    };
}

export async function deleteScript(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) {
        console.error("Error deleting script:", error);
        throw new Error("Failed to delete script");
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
}

export async function parsePdfAction(formData: FormData): Promise<ParsedScript | { error: string }> {
    console.log("[Action] Parsing PDF with Structural Reconstruction (No Filtering)...");

    // Lazy load pdf-parse to avoid top-level import issues in Next.js bundles
    const pdf = require("pdf-parse/lib/pdf-parse.js");

    const file = formData.get("file") as File;

    if (!file) {
        return { error: "No file provided" };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // EXTRACTION: Capture layout data for precise text reconstruction
        let allItems: { str: string; x: number; y: number; w: number }[] = [];

        const render_page = (pageData: any) => {
            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            };
            return pageData.getTextContent(render_options).then((textContent: any) => {
                for (const item of textContent.items) {
                    const str = item.str;
                    // transform: [scaleX, skewY, skewX, scaleY, x, y]
                    const x = item.transform[4];
                    const y = item.transform[5];
                    const w = item.width;

                    if (str.trim().length === 0 && w < 2) continue; // Skip empty tiny items

                    allItems.push({ str, x, y, w });
                }
                return ""; // We construct text manually
            });
        };

        await pdf(buffer, { pagerender: render_page });

        // RECONSTRUCTION: Build text respecting visual layout (Newlines & Spaces)
        let cleanRawText = "";
        let lastY = -1;
        let lastX = -1;
        let lastWidth = 0;

        for (const item of allItems) {
            // Newline Detection (Significant Y change)
            // PDF coords: Y=0 at bottom.
            const isNewLine = lastY !== -1 && Math.abs(item.y - lastY) > 6;

            if (isNewLine) {
                cleanRawText += "\n";
                lastX = -1; // Reset X tracking
            } else {
                // Space Detection (Significant X gap)
                if (lastX !== -1) {
                    const gap = item.x - (lastX + lastWidth);
                    if (gap > 2) { // >2px gap implies a space
                        cleanRawText += " ";
                    }
                }
            }

            cleanRawText += item.str;

            lastY = item.y;
            lastX = item.x;
            lastWidth = item.w;
        }

        console.log("[Action] Text Reconstructed. Length:", cleanRawText.length);
        // console.log("[Action] Preview:", cleanRawText.substring(0, 200));

        // Parse text into structured script
        const script = parseScript(cleanRawText);

        if (script.lines.length === 0) {
            return { error: "Could not detect any dialogue lines. Ensure the script uses standard formatting (CHARACTER NAMES in CAPS)." };
        }

        return script;
    } catch (error) {
        console.error("Error parsing PDF:", error);
        return { error: "Failed to parse PDF file." };
    }
}
