"use client";

import { useEffect, useState } from "react";
import { isNativePlatform } from "@/lib/platform/device";
import { resolvePostAuthDestination } from "@/lib/platform/post-auth-destination";

interface PostAuthDestinationInputProps {
    requestedNext?: string | null;
}

export function PostAuthDestinationInput({ requestedNext }: PostAuthDestinationInputProps) {
    const [destination, setDestination] = useState(() => (
        resolvePostAuthDestination({
            requestedNext,
            isNativeShell: false,
        })
    ));

    useEffect(() => {
        setDestination(resolvePostAuthDestination({
            requestedNext,
            isNativeShell: isNativePlatform(),
        }));
    }, [requestedNext]);

    return (
        <input
            type="hidden"
            name="next"
            value={destination}
            readOnly
            suppressHydrationWarning
        />
    );
}
