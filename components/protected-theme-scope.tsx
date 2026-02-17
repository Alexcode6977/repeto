"use client";

import { useEffect } from "react";

export function ProtectedThemeScope() {
  useEffect(() => {
    document.documentElement.classList.add("protected-theme");

    return () => {
      document.documentElement.classList.remove("protected-theme");
    };
  }, []);

  return null;
}
