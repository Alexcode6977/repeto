export interface TroupePlaysScreenProps {
    plays: any[];
    troupeId: string;
    canManage: boolean;
    isAdmin: boolean;
    userTier: any;
    userEmail: string | null;
    showImportWizard: boolean;
    onOpenImportWizard: () => void;
    onCloseImportWizard: () => void;
    onImportComplete: () => Promise<void>;
}
