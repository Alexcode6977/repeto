"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function TroupeActions() {
    return (
        <div className="flex w-full gap-3 mt-2 mb-6 items-center">
            <Button asChild className="flex-1 bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 h-[36px] rounded-xl px-4 text-xs font-semibold shadow-none">
                <Link href="/troupes/join">Rejoindre</Link>
            </Button>
            <Button asChild className="flex-1 bg-[#7F77DD] text-white hover:bg-[#7F77DD]/90 h-[36px] rounded-xl px-4 text-xs font-semibold shadow-none">
                <Link href="/troupes/create">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Créer
                </Link>
            </Button>
            
            <Sheet>
                <SheetTrigger asChild>
                    <button className="flex-shrink-0 w-[36px] h-[36px] flex items-center justify-center bg-white border border-gray-200 rounded-[10px] text-gray-500 font-bold hover:bg-gray-50 transition-colors">
                        ?
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[20px] max-h-[85vh] overflow-y-auto px-6 pt-5 pb-6 bg-white outline-none sm:max-w-md sm:mx-auto">
                    <SheetHeader className="text-left mb-6">
                        <SheetTitle className="text-xl font-bold text-[#1a1a1a]">Découvrez les troupes</SheetTitle>
                        <SheetDescription className="text-sm text-gray-500 mt-1 pb-1">
                            Tout ce que vous pouvez faire ensemble
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-6">
                        {/* Section 1 */}
                        <div>
                            <div className="text-[9px] uppercase text-[#bbb] tracking-[1px] font-semibold mb-[10px]">
                                Comment ça marche
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-3 items-start">
                                    <div className="flex-shrink-0 w-[24px] h-[24px] rounded-full bg-[#EEEDFE] text-[#7F77DD] flex items-center justify-center text-[13px] font-bold">1</div>
                                    <div className="mt-[-2px]">
                                        <div className="text-[13px] font-bold text-[#1a1a1a]">Créez ou rejoignez</div>
                                        <div className="text-[11px] text-[#888] leading-[1.4] mt-0.5">
                                            Créez votre troupe et partagez le code d'invitation, ou entrez un code pour rejoindre une troupe existante.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="flex-shrink-0 w-[24px] h-[24px] rounded-full bg-[#EEEDFE] text-[#7F77DD] flex items-center justify-center text-[13px] font-bold">2</div>
                                    <div className="mt-[-2px]">
                                        <div className="text-[13px] font-bold text-[#1a1a1a]">Partagez vos textes</div>
                                        <div className="text-[11px] text-[#888] leading-[1.4] mt-0.5">
                                            Le metteur en scène importe les pièces et distribue les rôles à chaque membre.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="flex-shrink-0 w-[24px] h-[24px] rounded-full bg-[#EEEDFE] text-[#7F77DD] flex items-center justify-center text-[13px] font-bold">3</div>
                                    <div className="mt-[-2px]">
                                        <div className="text-[13px] font-bold text-[#1a1a1a]">Répétez à votre rythme</div>
                                        <div className="text-[11px] text-[#888] leading-[1.4] mt-0.5">
                                            Chacun travaille ses répliques sur son téléphone, où et quand il veut.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px w-full bg-black/[0.04] my-4" />

                        {/* Section 2 */}
                        <div>
                            <div className="text-[9px] uppercase text-[#bbb] tracking-[1px] font-semibold mb-[10px]">
                                Ce que vous pouvez faire
                            </div>
                            <div className="space-y-3">
                                {[
                                    { icon: "📅", title: "Organisez vos répétitions", desc: "Planifiez les séances et partagez le calendrier avec toute la troupe." },
                                    { icon: "💬", title: "Recevez du feedback", desc: "Le metteur en scène vous envoie ses retours et notes après chaque session." },
                                    { icon: "✏️", title: "Annotez votre texte", desc: "Ajoutez des notes personnelles à vos répliques pour votre personnage." },
                                    { icon: "🎬", title: "Indications de mise en scène", desc: "Recevez les indications de jeu et de placement de votre metteur en scène." },
                                    { icon: "🎧", title: "Écoutez avec les vraies voix", desc: "Écoutez votre pièce lue avec les voix de vos partenaires." },
                                ].map((feature, i) => (
                                    <div key={i} className="flex gap-3 items-center">
                                        <div className="flex-shrink-0 w-[28px] h-[28px] rounded-full bg-[#f5f4fa] flex items-center justify-center text-[14px]">
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <div className="text-[12px] font-bold text-[#1a1a1a]">{feature.title}</div>
                                            <div className="text-[10px] text-[#888] leading-[1.4]">{feature.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <SheetClose asChild>
                                <Button className="w-full bg-[#7F77DD] hover:bg-[#7F77DD]/90 text-white font-bold py-[14px] h-auto rounded-[12px] text-[14px] shadow-none">
                                    C'est parti !
                                </Button>
                            </SheetClose>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
