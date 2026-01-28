'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateTroupeDialog } from "@/components/create-troupe-dialog";

export default function CreateTroupePage() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Open dialog on mount
        setOpen(true);
    }, []);

    const handleOpenChange = (open: boolean) => {
        setOpen(open);
        // Don't navigate here - let the dialog handle navigation after successful creation
        // Only navigate back if user cancels (but dialog already handles that too)
    };

    return (
        <CreateTroupeDialog open={open} onOpenChange={handleOpenChange} />
    );
}
