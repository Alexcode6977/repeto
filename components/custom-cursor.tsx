"use client";

import { useEffect, useState } from "react";

/**
 * Custom cursor component for better visibility on iPad with mouse/trackpad.
 * Only renders on devices with fine pointer (mouse/trackpad), not touch-only.
 */
export function CustomCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 });
    const [isVisible, setIsVisible] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isClicking, setIsClicking] = useState(false);

    useEffect(() => {
        // Only show on devices with mouse/trackpad (pointer: fine)
        const hasPointer = window.matchMedia("(pointer: fine)").matches;
        // Check if likely iPad or tablet with pointer
        const isTabletWithPointer = /iPad|Android/i.test(navigator.userAgent) && hasPointer;

        if (!isTabletWithPointer) {
            // On desktop, don't show custom cursor (native cursor is fine)
            return;
        }

        setIsVisible(true);

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseDown = () => setIsClicking(true);
        const handleMouseUp = () => setIsClicking(false);

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isInteractive = !!(
                target.tagName === "A" ||
                target.tagName === "BUTTON" ||
                target.closest("a") ||
                target.closest("button") ||
                target.closest("[role='button']") ||
                target.classList.contains("cursor-pointer") ||
                window.getComputedStyle(target).cursor === "pointer"
            );

            setIsHovering(isInteractive);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mouseover", handleMouseOver);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mouseover", handleMouseOver);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={`custom-cursor ${isClicking ? "clicking" : ""} ${isHovering ? "hovering" : ""}`}
            style={{
                left: position.x,
                top: position.y,
            }}
        />
    );
}
