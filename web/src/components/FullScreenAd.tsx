"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = { onClose: () => void; children?: React.ReactNode };

export default function FullScreenAd({ onClose, children }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const modal = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 999999 }}
      className="fixed inset-0 z-[99999]"
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)" }}
        aria-hidden
      />
      <div
        style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 16 }}
      >
        <div
          style={{ position: "relative", width: "100%", maxWidth: 880, background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
        >
          <button
            onClick={onClose}
            aria-label="Close ad"
            title="Κλείσιμο"
            style={{
              position: "absolute", right: 12, top: 12, width: 36, height: 36,
              borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 20
            }}
          >
            ×
          </button>
          <div style={{ minHeight: 360, display: "grid", placeItems: "center", background: "#f5f5f5", borderRadius: 16 }}>
            {children ?? <div>[Full-Screen Ad Placeholder]</div>}
          </div>
          <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "#666" }}>
            Διαφήμιση • Αναβάθμισε πλάνο για λιγότερες/καθόλου
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null; // SSR
  // Αν για κάποιο λόγο αποτύχει το portal, κάνε render inline:
  try {
    return createPortal(modal, document.body);
  } catch {
    return modal;
  }
}