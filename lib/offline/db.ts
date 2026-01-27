import Dexie, { type EntityTable } from 'dexie';

interface OfflineScript {
    id: string; // The play/script UUID
    title: string;
    lines: any[]; // Storing the full JSON structure of lines
    scenes: any[];
    characters: any[];
    lastSync: Date;
}

interface OfflineAsset {
    id: string; // line_id
    scriptId: string; // foreign key to script
    blob: ArrayBuffer;
    hash: string;
    voiceId: string; // To detect if voice changed
}

const db = new Dexie('SouffleurOfflineDB') as Dexie & {
    scripts: EntityTable<OfflineScript, 'id'>;
    assets: EntityTable<OfflineAsset, 'id'>;
};

// Schema definition
db.version(1).stores({
    scripts: 'id, title',
    assets: 'id, scriptId, hash, [scriptId+hash]' // Composite index for efficient querying
});

export type { OfflineScript, OfflineAsset };
export { db };
