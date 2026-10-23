import { useState, useEffect } from "react";

export type ViewMode = "cards" | "table";

export function useResponsiveViewMode<T extends string = ViewMode>(
  defaultBreakpoint = 768,
  desktopDefault: T = "table" as unknown as T,
  mobileDefault: T = "cards" as unknown as T
) {
  const [viewMode, setViewMode] = useState<T>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= defaultBreakpoint ? desktopDefault : mobileDefault;
    }
    return desktopDefault;
  });
  const [hasUserToggled, setHasUserToggled] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      if (!hasUserToggled && typeof window !== "undefined") {
        setViewMode(window.innerWidth >= defaultBreakpoint ? desktopDefault : mobileDefault);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasUserToggled, defaultBreakpoint, desktopDefault, mobileDefault]);

  const switchToCards = () => {
    setHasUserToggled(true);
    setViewMode(mobileDefault);
  };

  const switchToTable = () => {
    setHasUserToggled(true);
    setViewMode(desktopDefault);
  };

  return {
    viewMode,
    setViewMode,
    hasUserToggled,
    setHasUserToggled,
    switchToCards,
    switchToTable,
  };
}
