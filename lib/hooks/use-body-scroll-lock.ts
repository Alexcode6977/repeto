"use client";

import { useEffect } from "react";

interface LockedScrollStyles {
    htmlOverflow: string;
    bodyOverflow: string;
    bodyPosition: string;
    bodyWidth: string;
    bodyTop: string;
    bodyInset: string;
}

export function useBodyScrollLock(locked: boolean) {
    useEffect(() => {
        if (!locked || typeof window === "undefined") {
            return;
        }

        const { documentElement, body } = document;
        const scrollY = window.scrollY;
        const previousStyles: LockedScrollStyles = {
            htmlOverflow: documentElement.style.overflow,
            bodyOverflow: body.style.overflow,
            bodyPosition: body.style.position,
            bodyWidth: body.style.width,
            bodyTop: body.style.top,
            bodyInset: body.style.inset,
        };

        documentElement.style.overflow = "hidden";
        body.style.overflow = "hidden";
        body.style.position = "fixed";
        body.style.width = "100%";
        body.style.inset = "0";
        body.style.top = `-${scrollY}px`;

        return () => {
            documentElement.style.overflow = previousStyles.htmlOverflow;
            body.style.overflow = previousStyles.bodyOverflow;
            body.style.position = previousStyles.bodyPosition;
            body.style.width = previousStyles.bodyWidth;
            body.style.top = previousStyles.bodyTop;
            body.style.inset = previousStyles.bodyInset;
            window.scrollTo({ top: scrollY, behavior: "auto" });
        };
    }, [locked]);
}
