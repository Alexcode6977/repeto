import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SEARCH_ROOTS = ["app", "components"];
const FILE_EXTENSION_PATTERN = /\.(tsx|jsx)$/;
const MIXED_TREE_MARKERS = ["md:hidden", "hidden md:"];

const ALLOWLIST = new Set([
    "app/(protected)/dashboard/components/import-wizard.tsx",
    "app/(protected)/dashboard/components/script-card.tsx",
    "app/(protected)/troupes/[troupeId]/plays/components/troupe-import-wizard.tsx",
]);

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.name.startsWith(".")) {
            continue;
        }

        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...await walk(entryPath));
            continue;
        }

        if (FILE_EXTENSION_PATTERN.test(entry.name)) {
            files.push(entryPath);
        }
    }

    return files;
}

async function main() {
    const files = [];

    for (const root of SEARCH_ROOTS) {
        files.push(...await walk(path.join(ROOT_DIR, root)));
    }

    const newOffenders = [];
    const baselineOffenders = [];

    for (const absoluteFilePath of files) {
        const relativeFilePath = path.relative(ROOT_DIR, absoluteFilePath).split(path.sep).join("/");
        const contents = await readFile(absoluteFilePath, "utf8");
        const hasMixedMarkers = MIXED_TREE_MARKERS.every((marker) => contents.includes(marker));

        if (!hasMixedMarkers) {
            continue;
        }

        if (ALLOWLIST.has(relativeFilePath)) {
            baselineOffenders.push(relativeFilePath);
            continue;
        }

        newOffenders.push(relativeFilePath);
    }

    if (baselineOffenders.length > 0) {
        console.log(`Baseline tracked mixed-shell files: ${baselineOffenders.length}`);
    }

    if (newOffenders.length === 0) {
        console.log("No new mixed-shell screen files detected.");
        return;
    }

    console.error("New mixed-shell screen files detected:");
    for (const filePath of newOffenders) {
        console.error(`- ${filePath}`);
    }
    console.error("");
    console.error("Rule: do not mount full mobile and desktop screen trees in the same file.");
    console.error("Create explicit `.mobile` / `.desktop` renderers or a wrapper screen component instead.");
    process.exitCode = 1;
}

await main();
