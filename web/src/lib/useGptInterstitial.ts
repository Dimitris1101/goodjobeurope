"use client";

import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    googletag?: any;
  }
}

export function useGptInterstitial(adUnitPath: string, enableNavBar = false, enableUnhide = false) {
  const slotRef = useRef<any>(null);
  const readyRef = useRef(false);

  // Init GPT slot once
  useEffect(() => {
    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd.push(function () {
      if (slotRef.current) return;
      const slot = window.googletag
        .defineOutOfPageSlot(adUnitPath, window.googletag.enums.OutOfPageFormat.INTERSTITIAL);
      if (!slot) return; // σε περιβάλλοντα που δεν υποστηρίζονται

      slot.setConfig?.({
        interstitial: {
          triggers: {
            navBar: !!enableNavBar,
            unhideWindow: !!enableUnhide,
          },
        },
      });

      slot.addService(window.googletag.pubads());
      window.googletag.pubads().enableSingleRequest();
      window.googletag.enableServices();

      slotRef.current = slot;
      readyRef.current = true;
    });
  }, [adUnitPath, enableNavBar, enableUnhide]);

  // Ζήτα προβολή όταν θέλεις (π.χ. 2.5s μετά το mount του AdProvider)
  const requestInterstitial = useCallback(() => {
    if (!readyRef.current || !window.googletag) return false;
    // Προσοχή: Το display() χωρίς id κάνει request όλων των slots που έχουν οριστεί ως τώρα.
    // Αν σε αυτή τη φάση έχεις μόνο το interstitial slot, είναι οκ:
    window.googletag.cmd.push(function () {
      window.googletag.display();
    });
    return true;
  }, []);

  return { requestInterstitial };
}