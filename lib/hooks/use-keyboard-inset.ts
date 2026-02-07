import { useEffect } from "react";

export function useKeyboardInset(active = true) {
    useEffect(() => {
        if (!active || typeof window === "undefined") return;

        const root = document.documentElement;
        const visualViewport = window.visualViewport;

        if (!visualViewport) return;

        const updateInset = () => {
            const offset = Math.max(
                0,
                window.innerHeight - visualViewport.height - visualViewport.offsetTop
            );
            root.style.setProperty("--keyboard-offset", `${offset}px`);
        };

        updateInset();

        visualViewport.addEventListener("resize", updateInset);
        visualViewport.addEventListener("scroll", updateInset);

        return () => {
            visualViewport.removeEventListener("resize", updateInset);
            visualViewport.removeEventListener("scroll", updateInset);
            root.style.setProperty("--keyboard-offset", "0px");
        };
    }, [active]);
}
