import { useEffect, useRef } from "react";

function useOutsideClick(elRef: any, callback: any) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!elRef.current.contains(e.target) && callbackRef.current) {
        callbackRef.current(e);
      }
    };
    // Listen in bubble phase so element click handlers run first and can stop propagation.
    document.addEventListener("mousedown", handleClickOutside, false);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, false);
    };
  }, [callbackRef, elRef]);
}

export default useOutsideClick;
