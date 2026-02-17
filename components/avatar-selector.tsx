"use client";

import { useState, useCallback } from "react";
import { User, Camera, ImageIcon, Loader2, AlertCircle, ZoomIn, Check, ArrowLeft } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Cropper, { Area } from "react-easy-crop";

// Predefined theater-themed avatars with real images
const PREDEFINED_AVATARS = [
    { id: "comedy", label: "Comédie", src: "/avatars/comedy.png" },
    { id: "tragedy", label: "Tragédie", src: "/avatars/tragedy.png" },
    { id: "mystery", label: "Mystère", src: "/avatars/mystery.png" },
    { id: "director", label: "Metteur en scène", src: "/avatars/director.png" },
    { id: "dancer", label: "Danseuse", src: "/avatars/dancer.png" },
    { id: "maestro", label: "Maestro", src: "/avatars/maestro.png" },
    { id: "spotlight", label: "Projecteur", src: "/avatars/spotlight.png" },
    { id: "bard", label: "Le Barde", src: "/avatars/bard.png" },
];

interface AvatarSelectorProps {
    currentAvatarUrl: string | null;
    userId: string;
    onAvatarChange: (newUrl: string) => void;
}

// Helper: crop the image using canvas
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = imageSrc;
    });

    const canvas = document.createElement("canvas");
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, size, size
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("Erreur de conversion")),
            "image/webp",
            0.85
        );
    });
}

export function AvatarSelector({ currentAvatarUrl, userId, onAvatarChange }: AvatarSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Crop state
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    // Step 1: User picks a file → show cropper
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg("L'image doit faire moins de 5 Mo.");
            return;
        }

        setErrorMsg(null);
        const url = URL.createObjectURL(file);
        setImageToCrop(url);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    // Step 2: User confirms crop → upload
    const handleCropConfirm = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        setIsUploading(true);
        setErrorMsg(null);
        const supabase = createClient();

        try {
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            const fileName = `${userId}/${Date.now()}.webp`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, croppedBlob, { upsert: true, contentType: "image/webp" });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl })
                .eq("id", userId);

            if (updateError) throw updateError;

            onAvatarChange(publicUrl);
            setImageToCrop(null);
            setIsOpen(false);
        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            setErrorMsg(error?.message || "Erreur lors de l'upload.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelectPredefined = async (avatar: typeof PREDEFINED_AVATARS[0]) => {
        const supabase = createClient();
        setIsUploading(true);
        setErrorMsg(null);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ avatar_url: avatar.src })
                .eq("id", userId);

            if (error) throw error;

            onAvatarChange(avatar.src);
            setIsOpen(false);
        } catch (error: any) {
            console.error("Error updating avatar:", error);
            setErrorMsg(error?.message || "Erreur lors de la mise à jour.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setImageToCrop(null);
            setErrorMsg(null);
        }
        setIsOpen(open);
    };

    return (
        <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetTrigger asChild>
                <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl ring-4 ring-border group-hover:ring-primary/50 transition-all">
                        {currentAvatarUrl ? (
                            <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-primary-foreground" />
                        )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <Camera className="w-8 h-8 text-white" />
                    </div>
                </div>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl bg-card dark:bg-[#0a0a0f] border-border/60 dark:border-white/10 px-5 pt-5 pb-8 max-h-[70vh]">
                {/* === CROP VIEW === */}
                {imageToCrop ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setImageToCrop(null)} className="text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h3 className="text-lg font-semibold text-foreground dark:text-white">Recadrer la photo</h3>
                        </div>

                        {/* Cropper area - fixed small size */}
                        <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden bg-black">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        {/* Zoom slider */}
                        <div className="flex items-center gap-3 px-2">
                            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.05}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                            />
                        </div>

                        {/* Confirm button */}
                        <Button
                            onClick={handleCropConfirm}
                            disabled={isUploading}
                            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
                        >
                            {isUploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-5 h-5 mr-2" />
                                    Valider
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    /* === SELECTION VIEW === */
                    <>
                        <SheetHeader className="mb-4">
                            <SheetTitle className="text-lg text-foreground dark:text-white">Changer ma photo</SheetTitle>
                        </SheetHeader>

                        <div className="space-y-5">
                            {/* Error message */}
                            {errorMsg && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>{errorMsg}</p>
                                </div>
                            )}

                            {/* Upload from gallery */}
                            <label className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10 hover:bg-muted/60 dark:hover:bg-white/10 transition-all cursor-pointer">
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} disabled={isUploading} />
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground dark:text-white">Importer depuis la galerie</p>
                                    <p className="text-xs text-muted-foreground">JPG, PNG • 5 Mo max</p>
                                </div>
                            </label>

                            {/* Predefined Avatars */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avatars Repeto</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {PREDEFINED_AVATARS.map((avatar) => (
                                        <button
                                            key={avatar.id}
                                            onClick={() => handleSelectPredefined(avatar)}
                                            disabled={isUploading}
                                            className="flex flex-col items-center gap-1.5 group/avatar transition-all"
                                        >
                                            <div className={cn(
                                                "w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-transparent transition-all group-hover/avatar:ring-primary group-hover/avatar:scale-105",
                                                currentAvatarUrl === avatar.src && "ring-primary ring-2"
                                            )}>
                                                <img
                                                    src={avatar.src}
                                                    alt={avatar.label}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">{avatar.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
