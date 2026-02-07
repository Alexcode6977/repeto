'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parsePdfAction, parsePdfWithAiAction } from "@/app/actions";
import { createPlay, getUserScripts, getSharedScripts } from "@/lib/actions/play";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, CheckCircle, Library, Globe } from "lucide-react";
import { ParsedScript } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export default function NewPlayPage({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const [unwrappedParams, setUnwrappedParams] = useState<{ troupeId: string } | null>(null);

    // Effect to unwrap params
    useEffect(() => {
        params.then(p => setUnwrappedParams(p));
    }, [params]);

    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [uploadMode, setUploadMode] = useState<"standard" | "ai">("standard");
    const [step, setStep] = useState<'upload' | 'review' | 'saving'>('upload');
    const [parsedScript, setParsedScript] = useState<ParsedScript | null>(null);
    const [characterAliases, setCharacterAliases] = useState<Record<string, string>>({});
    const router = useRouter();

    // library data
    const [userScripts, setUserScripts] = useState<any[]>([]);
    const [sharedScripts, setSharedScripts] = useState<any[]>([]);

    useEffect(() => {
        // Fetch library scripts on mount
        getUserScripts().then(setUserScripts);
        getSharedScripts().then(setSharedScripts);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            // Auto-guess title from filename
            const filename = e.target.files[0].name.replace('.pdf', '').replace(/_/g, ' ');
            if (!title) setTitle(filename);
        }
    };

    const handleParse = async () => {
        if (!file) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = uploadMode === "ai"
                ? await parsePdfWithAiAction(formData, unwrappedParams?.troupeId)
                : await parsePdfAction(formData);

            if ('error' in result) {
                alert(result.error);
                return;
            }

            setParsedScript(result);
            setCharacterAliases({});
            setStep('review');
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'analyse du PDF");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectScript = (script: any) => {
        if (!script.content) {
            alert("Ce script semble vide ou invalide.");
            return;
        }
        setTitle(script.title || "Pièce Importée");
        setParsedScript(script.content);
        setCharacterAliases({});
        setStep('review');
    };

    const handleSave = async () => {
        if (!unwrappedParams || !parsedScript || !title) return;

        setIsLoading(true);
        setStep('saving');
        try {
            const resolveAlias = (name: string): string => {
                let current = name;
                const seen = new Set<string>();
                while (characterAliases[current] && !seen.has(current)) {
                    seen.add(current);
                    current = characterAliases[current];
                }
                return current;
            };

            const hasAliases = Object.keys(characterAliases).length > 0;
            const scriptToSave: ParsedScript = hasAliases
                ? {
                    ...parsedScript,
                    lines: parsedScript.lines.map((line) =>
                        line.type === "dialogue"
                            ? { ...line, character: resolveAlias(line.character) }
                            : line
                    ),
                    characters: Array.from(
                        new Set(parsedScript.characters.map(resolveAlias))
                    ).sort((a, b) => a.localeCompare(b, "fr"))
                }
                : parsedScript;

            // For MVP we don't upload the PDF file to storage yet, we just store the parsed content.
            // Ideally we would upload via supabase.storage first.
            await createPlay(unwrappedParams.troupeId, title, scriptToSave, null);
            router.push(`/troupes/${unwrappedParams.troupeId}/plays`);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la sauvegarde de la pièce.");
            setStep('review');
        } finally {
            setIsLoading(false);
        }
    };

    if (!unwrappedParams) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Ajouter une nouvelle pièce</h1>
                <p className="text-muted-foreground">Importez un PDF ou choisissez depuis votre bibliothèque.</p>
            </div>

            <div className="space-y-6 border rounded-lg p-6 bg-card">
                {step === 'upload' && (
                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-8">
                            <TabsTrigger value="upload">
                                <Upload className="mr-2 h-4 w-4" />
                                Nouveau PDF
                            </TabsTrigger>
                            <TabsTrigger value="library">
                                <Library className="mr-2 h-4 w-4" />
                                Ma Bibliothèque
                            </TabsTrigger>
                            <TabsTrigger value="shared">
                                <Globe className="mr-2 h-4 w-4" />
                                Communauté
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Titre de la pièce</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Cyrano de Bergerac"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Mode import</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={uploadMode === "standard" ? "default" : "outline"}
                                        onClick={() => setUploadMode("standard")}
                                    >
                                        PDF classique
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={uploadMode === "ai" ? "default" : "outline"}
                                        onClick={() => setUploadMode("ai")}
                                    >
                                        PDF + Nettoyage IA
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Classique: pour un PDF deja propre. IA: pour un PDF brut/OCR a normaliser.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Fichier PDF</Label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="cursor-pointer"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleParse}
                                disabled={!file || !title || isLoading}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {uploadMode === "ai" ? "Nettoyage IA + analyse..." : "Analyse du script..."}
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {uploadMode === "ai" ? "Nettoyer + analyser (IA)" : "Analyser le PDF"}
                                    </>
                                )}
                            </Button>
                        </TabsContent>

                        <TabsContent value="library">
                            <div className="space-y-4">
                                {userScripts.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Vous n'avez pas encore de scripts dans votre bibliothèque personnelle.</p>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {userScripts.map(script => (
                                            <Card key={script.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSelectScript(script)}>
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">{script.title}</h3>
                                                        <p className="text-xs text-muted-foreground">{new Date(script.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm">Choisir</Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="shared">
                            <div className="space-y-4">
                                {sharedScripts.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Aucun script partagé disponible pour le moment.</p>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {sharedScripts.map(script => (
                                            <Card key={script.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSelectScript(script)}>
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">{script.title}</h3>
                                                        <p className="text-xs text-muted-foreground">Public</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm">Choisir</Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

                {step === 'review' && parsedScript && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-muted p-4 rounded-md space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle className="text-green-500 h-5 w-5" />
                                Prêt à importer : {title}
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Personnages :</span>
                                    <span className="font-medium ml-2">{parsedScript.characters.length}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Scènes déduites :</span>
                                    <span className="font-medium ml-2">{parsedScript.scenes.length}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Lignes de dialogue :</span>
                                    <span className="font-medium ml-2">{parsedScript.lines.filter(l => l.type === 'dialogue').length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Aperçu des personnages</Label>
                            <div className="flex flex-wrap gap-2">
                                {parsedScript.characters.slice(0, 10).map(c => (
                                    <span key={c} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
                                        {c}
                                    </span>
                                ))}
                                {parsedScript.characters.length > 10 && (
                                    <span className="text-xs text-muted-foreground self-center">
                                        + {parsedScript.characters.length - 10} autres...
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Fusionner des personnages (optionnel)</Label>
                            <p className="text-xs text-muted-foreground">
                                Exemple: relier "VALET DE CHAMBRE" vers "JOSEPH". Les repliques seront attribuees au role cible.
                            </p>
                            <div className="space-y-2 max-h-52 overflow-auto pr-1">
                                {parsedScript.characters.map((character) => (
                                    <div key={character} className="grid grid-cols-[1fr_180px] gap-2 items-center">
                                        <span className="text-sm font-medium">{character}</span>
                                        <select
                                            className="h-9 rounded-md border bg-background px-2 text-sm"
                                            value={characterAliases[character] || "none"}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setCharacterAliases((prev) => {
                                                    if (value === "none") {
                                                        const next = { ...prev };
                                                        delete next[character];
                                                        return next;
                                                    }
                                                    return { ...prev, [character]: value };
                                                });
                                            }}
                                        >
                                            <option value="none">Ne pas fusionner</option>
                                            {parsedScript.characters
                                                .filter((c) => c !== character)
                                                .map((candidate) => (
                                                    <option key={candidate} value={candidate}>
                                                        {candidate}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                                Retour
                            </Button>
                            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Valider et Créer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
