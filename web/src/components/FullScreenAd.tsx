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
    <div style={{ position: "fixed", inset: 0, zIndex: 9999999 }}>
      {/* overlay */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)" }}
        aria-hidden
      />

      {/* content wrapper */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 980,
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 30px 90px rgba(0,0,0,.45)",
          }}
        >
          {/* single close button */}
          <button
            onClick={onClose}
            aria-label="Close ad"
            title="Close"
            style={{
              position: "absolute",
              right: 14,
              top: 14,
              width: 40,
              height: 40,
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,.35)",
              background: "rgba(0,0,0,.35)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 24,
              lineHeight: "38px",
              zIndex: 10,
              backdropFilter: "blur(6px)",
            }}
          >
            ×
          </button>

          {/* children = το design σου */}
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  try {
    return createPortal(modal, document.body);
  } catch {
    return modal;
  }
}

