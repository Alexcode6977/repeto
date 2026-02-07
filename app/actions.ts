"use server";

import { ParsedScript } from "@/lib/types";
import {
    parsePdfAction as parsePdfActionRobust,
    importScriptWithAI
} from "@/app/(protected)/dashboard/actions";

export async function parsePdfAction(formData: FormData): Promise<ParsedScript | { error: string }> {
    const result = await parsePdfActionRobust(formData);
    if ("error" in result) return result;
    return result;
}

export async function parsePdfWithAiAction(
    formData: FormData,
    troupeId?: string
): Promise<ParsedScript | { error: string }> {
    const result = await importScriptWithAI(formData, troupeId);
    if ("error" in result) return result;
    return result;
}
