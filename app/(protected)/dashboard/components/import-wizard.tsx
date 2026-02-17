"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Check,
    Loader2,
    Upload,
    X,
    UserPlus,
    Edit3,
    BookOpen,
    Crown,
    Link2,
    Sparkles,
} from "lucide-react";
import {
    detectCharactersAction,
    finalizeParsingAction,
    importScriptWithAI,
    saveScript,
} from "../actions";
import { CatalogBrowser } from "./catalog-browser";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ImportWizardProps {
    showImportGuide: boolean;
    setShowImportGuide: (show: boolean) => void;
    userTier: "free" | "solo_pro" | "troupe" | "troupe_xl";
    userEmail: string | null;
    onImportComplete: () => Promise<void>;
    onError: (msg: string) => void;
}

export function ImportWizard({
    showImportGuide,
    setShowImportGuide,
    userTier,
    userEmail,
    onImportComplete,
    onError,
}: ImportWizardProps) {
    // --- STATE ---
    const [isImporting, setIsImporting] = useState(false);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [validationModalOpen, setValidationModalOpen] = useState(false);
    const [detectedCharacters, setDetectedCharacters] = useState<string[]>([]);
    const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
    const [characterAliases, setCharacterAliases] = useState<Record<string, string>>({});
    const [customTitle, setCustomTitle] = useState("");
    const [importProgress, setImportProgress] = useState(0);

    // Character editing in Validation Modal
    const [newCharName, setNewCharName] = useState("");
    const [editingChar, setEditingChar] = useState<string | null>(null);
    const [tempCharName, setTempCharName] = useState("");
    const [validationMessage, setValidationMessage] = useState<string | null>(null);



    // AI Import State
    const [isAiImporting, setIsAiImporting] = useState(false);
    const [aiImportStep, setAiImportStep] = useState(0);
    const [aiImportProgress, setAiImportProgress] = useState(0);
    const [aiImportSuccess, setAiImportSuccess] = useState(false);
    const [aiImportCountdown, setAiImportCountdown] = useState(300);
    const [aiImportCancelled, setAiImportCancelled] = useState(false);

    // Choice screen state
    const [importChoice, setImportChoice] = useState<"choice" | "catalog">("choice");
    //const [isPending, startTransition] = useTransition(); // Using local isImporting instead for now or need wrapping
    const [_isPending, startTransition] = useTransition();

    const aiImportIntervalsRef = useRef<NodeJS.Timeout[]>([]);

    // --- HANDLERS (LEGACY / STANDARD) ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCurrentFile(file);
        const formData = new FormData();
        formData.append("file", file);

        setIsImporting(true);
        setImportProgress(20);
        setValidationMessage(null); // Reset message

        startTransition(async () => {

            const result = await detectCharactersAction(formData);
            setIsImporting(false);

            if ("error" in result) {
                onError(result.error);
            } else {
                setDetectedCharacters(result.characters || []);
                setSelectedCharacters(result.characters || []);
                setCustomTitle(result.title || file.name.replace(".pdf", ""));
                setValidationModalOpen(true);
            }
            e.target.value = "";
        });
    };

    const startDeepParsing = async () => {
        if (!currentFile || selectedCharacters.length === 0) return;

        setValidationModalOpen(false);
        setIsImporting(true); // Re-use isImporting for progress modal
        setImportProgress(0);

        // Fake progress
        const interval = setInterval(() => {
            setImportProgress((prev) => (prev < 90 ? prev + 1 : prev));
        }, 1000);

        try {
            const formData = new FormData();
            formData.append("file", currentFile);

            const result = await finalizeParsingAction(formData, selectedCharacters, characterAliases);

            clearInterval(interval);
            setImportProgress(100);

            if ("error" in result) {
                onError(result.error);
                setCurrentFile(null); // Reset on error to allow retry
                setIsImporting(false);
                setShowImportGuide(false);
            } else {
                // CHECK FOR NEWLY DETECTED CHARACTERS (Strict Mode)
                if (result.detectedButIgnored && result.detectedButIgnored.length > 0) {
                    // Filter out already detected ones to be sure
                    const newChars = result.detectedButIgnored.filter(c => !detectedCharacters.includes(c));

                    if (newChars.length > 0) {
                        // WE NEED CONFIRMATION
                        setIsImporting(false); // Stop progress modal

                        // Add new characters to the list AND select them
                        setDetectedCharacters(prev => [...prev, ...newChars]);
                        setSelectedCharacters(prev => [...prev, ...newChars]);

                        setValidationMessage(`⚠️ L'analyse approfondie a détecté ${newChars.length} personnage(s) supplémentaire(s). Veuillez confirmer.`);
                        setValidationModalOpen(true);
                        return; // STOP HERE
                    }
                }

                await saveScript({ ...result, title: customTitle });
                await onImportComplete();
                setIsImporting(false);
                setCurrentFile(null);
                setShowImportGuide(false);
            }
        } catch (e) {
            onError("Erreur lors de l'analyse approfondie.");
            setIsImporting(false);
            setCurrentFile(null);
            setShowImportGuide(false);
        }
    };


    // --- HANDLERS (AI IMPORT) ---

    const cancelAiImport = () => {
        setAiImportCancelled(true);
        setIsAiImporting(false);
        setAiImportStep(0);
        aiImportIntervalsRef.current.forEach((id) => clearInterval(id));
        aiImportIntervalsRef.current = [];
    };

    const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset State
        setIsAiImporting(true);
        setAiImportSuccess(false);
        setAiImportCancelled(false);
        setAiImportStep(1); // Step 1: Extraction
        setAiImportProgress(0);
        aiImportIntervalsRef.current = [];

        // Simulate extraction (Step 1)
        const extractionInterval = setInterval(() => {
            setAiImportProgress((prev) => Math.min(prev + 15, 90));
        }, 200);
        aiImportIntervalsRef.current.push(extractionInterval);

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Finish Step 1
            clearInterval(extractionInterval);
            setAiImportProgress(100);
            await new Promise((r) => setTimeout(r, 300));

            if (aiImportCancelled) return;

            // Step 2: AI Cleaning
            setAiImportStep(2);
            setAiImportProgress(0);
            setAiImportCountdown(300);

            // Countdown
            const countdownInterval = setInterval(() => {
                setAiImportCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            aiImportIntervalsRef.current.push(countdownInterval);

            // Cleaning Progress
            const cleaningStart = Date.now();
            const cleaningInterval = setInterval(() => {
                const elapsed = Date.now() - cleaningStart;
                const progress = Math.min(95, elapsed / 3000); // 3s per 1% approx
                setAiImportProgress(Math.floor(progress));
            }, 1000);
            aiImportIntervalsRef.current.push(cleaningInterval);

            const result = await importScriptWithAI(formData);

            clearInterval(cleaningInterval);

            if (aiImportCancelled) return;

            setAiImportProgress(100);
            await new Promise((r) => setTimeout(r, 300));

            if ("error" in result) {
                onError(result.error);
                setIsAiImporting(false);
                setAiImportStep(0);
            } else {
                // Step 3: Saving
                setAiImportStep(3);
                setAiImportProgress(0);

                const finalScript = {
                    ...result,
                    title: result.title || file.name.replace(".pdf", ""),
                };

                setAiImportProgress(50);
                await saveScript(finalScript);

                if (aiImportCancelled) return;

                setAiImportProgress(80);
                await onImportComplete();
                setAiImportProgress(100);

                setAiImportSuccess(true);

                setTimeout(() => {
                    setShowImportGuide(false);
                    setIsAiImporting(false);
                    setAiImportStep(0);
                    setAiImportSuccess(false);
                }, 1500);
            }
        } catch (err: any) {
            if (!aiImportCancelled) {
                onError(err.message || "Erreur lors de l'import Automatique.");
                setIsAiImporting(false);
                setAiImportStep(0);
            }
        } finally {
            e.target.value = "";
            aiImportIntervalsRef.current.forEach((id) => clearInterval(id));
            aiImportIntervalsRef.current = [];
        }
    };

    // --- UI HELPERS ---

    const addCharacter = () => {
        if (!newCharName.trim()) return;
        const name = newCharName.trim().toUpperCase();
        if (!detectedCharacters.includes(name)) {
            setDetectedCharacters((prev) => [...prev, name]);
            setSelectedCharacters((prev) => [...prev, name]);
        }
        setNewCharName("");
    };

    const handleRenameCharacter = (oldName: string) => {
        const finalNewName = tempCharName.trim().toUpperCase();
        if (!finalNewName || finalNewName === oldName) {
            setEditingChar(null);
            return;
        }
        setDetectedCharacters((prev) =>
            prev.map((c) => (c === oldName ? finalNewName : c))
        );
        setSelectedCharacters((prev) =>
            prev.map((c) => (c === oldName ? finalNewName : c))
        );
        setEditingChar(null);
    };

    const toggleCharacter = (char: string) => {
        setSelectedCharacters((prev) =>
            prev.includes(char)
                ? prev.filter((c) => c !== char)
                : [...prev, char]
        );
    };

    const handleAliasChange = (char: string, mainChar: string) => {
        if (mainChar === "none") {
            const newAliases = { ...characterAliases };
            delete newAliases[char];
            setCharacterAliases(newAliases);
            // If alias is removed, re-enable the character in import by default.
            setSelectedCharacters(prev => prev.includes(char) ? prev : [...prev, char]);
        } else {
            setCharacterAliases(prev => ({ ...prev, [char]: mainChar }));
            // If it's an alias, it shouldn't be selected as a separate character for import
            setSelectedCharacters(prev => prev.filter(c => c !== char));
        }
    };

    // --- RENDER ---

    if (!showImportGuide) {
        // Still show progress modals if working
        if (!isImporting && !isAiImporting && !validationModalOpen) return null;
    }

    return (
        <>
            {/* 1. PROGRESS MODAL (LEGACY / DEEP PARSING) */}
            {isImporting && !isAiImporting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    {/* Same style as previous modal */}
                    <div className="bg-popover border border-primary/20 p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(124,58,237,0.3)] animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto skeleton-shimmer">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Analyse approfondie...</h3>
                                <p className="text-muted-foreground text-sm">Repeto relie chaque réplique à son personnage</p>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.min(importProgress, 100)}%` }} />
                                </div>
                                <p className="text-primary font-bold text-lg">{Math.round(importProgress)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. VALIDATION MODAL */}
            {validationModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
                    <div className="bg-[#121212] border border-white/10 p-6 rounded-3xl w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" onClick={() => setValidationModalOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-foreground">Prêt à importer ?</h2>
                            <p className="text-muted-foreground text-sm mt-1">Vérifiez la liste des personnages détectés. Seuls les sélectionnés seront importés.</p>
                            {validationMessage && (
                                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-500 text-sm animate-in fade-in slide-in-from-top-2">
                                    <div className="w-5 h-5 shrink-0 mt-0.5"><Crown className="w-5 h-5" /></div>
                                    <p className="font-medium">{validationMessage}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Titre du script</label>
                                <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ex: Roméo et Juliette" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Personnages ({selectedCharacters.length})</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {detectedCharacters.map(char => (
                                        <div key={char} className="space-y-2">
                                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedCharacters.includes(char) ? 'bg-primary/20 border-primary/50 text-foreground' : characterAliases[char] ? 'bg-white/5 border-white/10 opacity-80' : 'bg-card border-white/10 text-muted-foreground hover:bg-white/10'}`}>
                                                <div onClick={() => !characterAliases[char] && toggleCharacter(char)} className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 cursor-pointer ${selectedCharacters.includes(char) ? 'bg-primary border-primary' : characterAliases[char] ? 'border-white/10' : 'border-white/20'}`}>
                                                    {selectedCharacters.includes(char) && <Check className="w-3 h-3 text-foreground" />}
                                                </div>
                                                {editingChar === char ? (
                                                    <input autoFocus type="text" value={tempCharName} onChange={(e) => setTempCharName(e.target.value)} onBlur={() => handleRenameCharacter(char)} onKeyDown={(e) => e.key === 'Enter' && handleRenameCharacter(char)} className="flex-1 bg-white/10 border-none rounded px-2 py-0.5 text-foreground focus:outline-none" />
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                                        <div className="flex flex-col min-w-0" onClick={() => !characterAliases[char] && toggleCharacter(char)}>
                                                            <span className="font-semibold truncate cursor-pointer">{char}</span>
                                                            {characterAliases[char] && (
                                                                <span className="text-[10px] text-primary flex items-center gap-1">
                                                                    <Link2 className="w-2.5 h-2.5" /> Lier à {characterAliases[char]}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-foreground/30 hover:text-foreground" onClick={(e) => { e.stopPropagation(); setEditingChar(char); setTempCharName(char); }}>
                                                            <Edit3 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <input type="text" value={newCharName} onChange={(e) => setNewCharName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCharacter()} className="flex-1 bg-card border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ajouter un personnage..." />
                                    <Button variant="outline" size="icon" onClick={addCharacter} className="rounded-xl border-white/10 hover:bg-white/10">
                                        <UserPlus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fusion de personnages (optionnel)</label>
                                <p className="text-xs text-muted-foreground">
                                    Exemple : lier <span className="font-semibold">VALET DE CHAMBRE</span> vers <span className="font-semibold">JOSEPH</span>.
                                </p>
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {detectedCharacters.map((char) => (
                                        <div key={`alias-${char}`} className="grid grid-cols-[1fr_1fr] items-center gap-2">
                                            <span className="text-xs font-semibold truncate">{char}</span>
                                            <Select value={characterAliases[char] || "none"} onValueChange={(val) => handleAliasChange(char, val)}>
                                                <SelectTrigger className="h-8 text-[10px] bg-white/5 border-white/10 rounded-lg text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Link2 className="w-3 h-3" />
                                                        <SelectValue placeholder="Ne pas fusionner" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1a1a1a] border-white/10">
                                                    <SelectItem value="none" className="text-xs">Ne pas fusionner</SelectItem>
                                                    {detectedCharacters
                                                        .filter((candidate) => candidate !== char && candidate !== characterAliases[char])
                                                        .map((candidate) => (
                                                            <SelectItem key={`${char}-${candidate}`} value={candidate} className="text-xs uppercase">
                                                                {candidate}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <Button onClick={startDeepParsing} disabled={selectedCharacters.length === 0} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl text-lg shadow-lg mt-6">
                            Lancer l'analyse finale
                        </Button>
                    </div>
                </div>
            )}

            {/* 3. IMPORT CHOICE SCREEN (NEW 3-COLUMN LAYOUT) */}
            {showImportGuide && importChoice === "choice" && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => { setShowImportGuide(false); }}>
                    <div className="bg-card border border-border p-8 rounded-3xl w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setShowImportGuide(false); }} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted z-10"><X className="w-5 h-5" /></button>

                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Importer une pièce</h2>
                            <p className="text-muted-foreground mt-2 text-lg">Choisissez votre méthode d'import</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 1. Catalog Import */}
                            <button
                                onClick={() => setImportChoice("catalog")}
                                className="cursor-pointer group relative flex flex-col h-full text-left"
                            >
                                <div className="absolute inset-0 bg-amber-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-amber-500/50" />
                                <div className="bg-card border border-border hover:border-amber-500/50 p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all group-hover:-translate-y-1 shadow-sm hover:shadow-xl w-full">
                                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
                                        <BookOpen className="w-10 h-10 text-amber-500" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground mb-3">Importer à partir du catalogue Repeto</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">
                                        Choisissez une pièce de théâtre directement depuis notre catalogue.
                                    </p>
                                    <div className="w-full py-3 rounded-xl bg-amber-500/10 text-amber-600 font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                        Parcourir le catalogue
                                    </div>
                                </div>
                            </button>

                            {/* 2. Format Repeto Import (Classic) */}
                            <label className="cursor-pointer group relative flex flex-col h-full">
                                <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-primary/50" />
                                <div className="bg-card border border-border hover:border-primary/50 p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all group-hover:-translate-y-1 shadow-sm hover:shadow-xl">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                        <Upload className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground mb-3">Importer votre texte au format Repeto</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">
                                        Pour les PDF déjà bien formatés (standard Repeto).
                                        <br />
                                        <span className="font-mono text-xs opacity-70 mt-2 block">[NOM] + Réplique</span>
                                    </p>
                                    <div className="w-full py-3 rounded-xl bg-primary/10 text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        Importer mon PDF
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => { setShowImportGuide(false); handleFileChange(e); }}
                                />
                            </label>

                            {/* 3. Assistant Repeto Import (AI) */}
                            <label className="cursor-pointer group relative flex flex-col h-full">
                                <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-emerald-500/50" />
                                <div className="bg-card border border-border hover:border-emerald-500/50 p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all group-hover:-translate-y-1 shadow-sm hover:shadow-xl">
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                                        <Sparkles className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground mb-3">Importer votre texte avec l'assistant Repeto</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">
                                        Pour les PDF bruts. Converti en <span className="font-semibold">standard Repeto</span>.
                                        <br />
                                        <span className="text-emerald-500 text-xs font-semibold mt-2 block">L'assistant détecte et aide à gérer les répliques.</span>
                                    </p>
                                    <div className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        PDF + Assistant Repeto
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleAiFileChange}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. CATALOG BROWSER */}
            {showImportGuide && importChoice === "catalog" && (
                <CatalogBrowser
                    onClose={() => { setImportChoice("choice"); }}
                    onImportComplete={async () => {
                        await onImportComplete();
                        setShowImportGuide(false);
                        setImportChoice("choice");
                    }}
                    onError={onError}
                />
            )}
        </>
    );
}
