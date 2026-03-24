"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TroupePlaysScreenProps } from "@/app/(protected)/troupes/[troupeId]/plays/troupe-plays-screen.types";

type InitialTroupePlaysScreenProps = Omit<
    TroupePlaysScreenProps,
    "showImportWizard" | "onOpenImportWizard" | "onCloseImportWizard" | "onImportComplete"
>;

export function useTroupePlaysScreen(props: InitialTroupePlaysScreenProps): TroupePlaysScreenProps {
    const [showImportWizard, setShowImportWizard] = useState(false);
    const router = useRouter();

    return {
        ...props,
        showImportWizard,
        onOpenImportWizard: () => setShowImportWizard(true),
        onCloseImportWizard: () => setShowImportWizard(false),
        onImportComplete: async () => {
            router.refresh();
        },
    };
}
