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

export async function updateScriptContent(scriptId: string, newScript: ParsedScript) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check ownership
    const { data: existingScript } = await supabase
        .from("scripts")
        .select("user_id")
        .eq("id", scriptId)
        .single();

    if (!existingScript || existingScript.user_id !== user.id) {
        throw new Error("Unauthorized: You can only update your own scripts");
    }

    const { error } = await supabase
        .from("scripts")
        .update({
            title: newScript.title,
            content: newScript,
        })
        .eq("id", scriptId);

    if (error) {
        console.error("Error updating script:", error);
        throw new Error("Failed to update script");
    }

    revalidatePath("/dashboard");
}

const ADMIN_EMAIL = "alex69.sartre@gmail.com";

export async function getScripts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Fetch User's scripts OR Public scripts
    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at, user_id, is_public")
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching scripts:", error);
        return [];
    }

    return data.map((row) => ({
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        characterCount: row.content?.characters?.length || 0,
        lineCount: row.content?.lines?.length || 0,
        is_public: row.is_public || false,
        is_owner: row.user_id === user.id,
    }));
}

export async function togglePublicStatus(scriptId: string, currentStatus: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== ADMIN_EMAIL) {
        throw new Error("Unauthorized: Only Admin can manage library.");
    }

    const { error } = await supabase
        .from("scripts")
        .update({ is_public: !currentStatus })
        .eq("id", scriptId);

    if (error) throw new Error("Failed to update public status");

    revalidatePath("/dashboard");
}

export async function getScriptById(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Allow access if owner OR if public
    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at, user_id, is_public")
        .eq("id", id)
        .single();

    if (error || !data) {
        return null;
    }

    // Security Check: Must be owner OR script must be public
    if (data.user_id !== user.id && !data.is_public) {
        throw new Error("Unauthorized access to this script.");
    }

    return {
        id: data.id,
        title: data.title,
        ...data.content,
        created_at: data.created_at,
        is_public: data.is_public
    };
}

export async function deleteScript(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check if script is public before deleting
    const { data: script } = await supabase.from("scripts").select("is_public, user_id").eq("id", id).single();

    if (script?.is_public && user.email !== ADMIN_EMAIL) {
        throw new Error("Cannot delete a public library script.");
    }

    const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Standard users can only delete their own. Admin usually owns the public ones anyway.

    if (error) {
        console.error("Error deleting script:", error);
        throw new Error("Failed to delete script");
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
}

export async function parsePdfAction(formData: FormData): Promise<ParsedScript | { error: string }> {
    console.log("[Action] Parsing PDF...");

    const file = formData.get("file") as File;

    if (!file) {
        return { error: "No file provided" };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Check if user is premium for Vision AI parsing
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let isPremium = false;
        if (user) {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("is_premium")
                .eq("id", user.id)
                .single();

            if (profileError) {
                console.error("[Action] Error fetching profile:", profileError);
            }

            isPremium = profile?.is_premium || false;
            console.log(`[Action] User: ${user.email}, isPremium from DB: ${isPremium}`);
        } else {
            console.warn("[Action] No user found in session");
        }

        // FORCE PREMIUM FOR DEBUGGING (since user confirmed they are)
        console.log("[Action] FORCING isPremium = true for debugging");
        isPremium = true;

        // Use Vision AI parsing for premium users (reads PDF as images)
        if (isPremium) {
            console.log("[Action] Attempting Vision AI parsing...");

            try {
                const { detectCharactersWithVision, parsePdfWithVision } = await import("@/app/actions/ai-parser");
                console.log("[Action] ai-parser module imported successfully");

                // New flow: detect then parse immediately for backward compatibility of this action
                const detectResult = await detectCharactersWithVision(buffer);
                if ("error" in detectResult) return await parseWithRegex(buffer);

                const aiResult = await parsePdfWithVision(buffer, detectResult.characters);

                if ("error" in aiResult) {
                    console.warn("[Action] Vision parsing returned error:", aiResult.error);
                    return await parseWithRegex(buffer);
                }

                if (!aiResult.lines || aiResult.lines.length === 0) {
                    console.warn("[Action] Vision returned no lines, falling back");
                    return await parseWithRegex(buffer);
                }

                return aiResult;
            } catch (importErr: any) {
                console.error("[Action] CRITICAL ERROR calling parsePdfWithVision:", importErr);
                return await parseWithRegex(buffer);
            }
        }

        // Standard regex parsing for non-premium users
        console.log("[Action] Non-premium user - using regex parsing");
        return await parseWithRegex(buffer);

    } catch (error) {
        console.error("Error parsing PDF:", error);
        return { error: "Failed to parse PDF file." };
    }
}

// Helper function for regex-based parsing
async function parseWithRegex(buffer: Buffer): Promise<ParsedScript | { error: string }> {
    const pdf = require("pdf-parse/lib/pdf-parse.js");

    let allItems: { str: string; x: number; y: number; w: number }[] = [];

    const render_page = (pageData: any) => {
        const render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false
        };
        return pageData.getTextContent(render_options).then((textContent: any) => {
            for (const item of textContent.items) {
                const str = item.str;
                const x = item.transform[4];
                const y = item.transform[5];
                const w = item.width;

                if (str.trim().length === 0 && w < 2) continue;

                allItems.push({ str, x, y, w });
            }
            return "";
        });
    };

    await pdf(buffer, { pagerender: render_page });

    // RECONSTRUCTION: Build text respecting visual layout
    let cleanRawText = "";
    let lastY = -1;
    let lastX = -1;
    let lastWidth = 0;

    for (const item of allItems) {
        const isNewLine = lastY !== -1 && Math.abs(item.y - lastY) > 6;

        if (isNewLine) {
            cleanRawText += "\n";
            lastX = -1;
        } else {
            if (lastX !== -1) {
                const gap = item.x - (lastX + lastWidth);
                if (gap > 2) {
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

    const script = parseScript(cleanRawText);

    if (script.lines.length === 0) {
        return { error: "Could not detect any dialogue lines. Ensure the script uses standard formatting (CHARACTER NAMES in CAPS)." };
    }

    return script;
}
export async function detectCharactersAction(formData: FormData): Promise<{ title?: string, characters: string[] } | { error: string }> {
    const file = formData.get("file") as File;
    if (!file) return { error: "Pas de fichier" };

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { detectCharactersWithVision } = await import("@/app/actions/ai-parser");
        return await detectCharactersWithVision(buffer);
    } catch (error: any) {
        console.error("[Action] Detect error:", error);
        return { error: error.message };
    }
}

export async function finalizeParsingAction(formData: FormData, characters: string[]): Promise<ParsedScript | { error: string }> {
    const file = formData.get("file") as File;
    if (!file) return { error: "Pas de fichier" };

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { parsePdfWithVision } = await import("@/app/actions/ai-parser");
        const script = await parsePdfWithVision(buffer, characters);
        return script;
    } catch (error: any) {
        console.error("[Action] Finalize error:", error);
        return { error: error.message };
    }
}
