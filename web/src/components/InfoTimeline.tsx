+"use client";

import { useMemo, useState } from "react";

type Step = { title: string; desc?: string };

const employeeSteps: Step[] = [
  { title: "Create your account or log in" },
  {
    title: "Fill in your information for accurate matching",
    desc: "Tip: you can always edit your details from your dashboard.",
  },
  {
    title: "Choose your plan",
    desc: "We recommend VIP for a better, ad-free experience with a profile photo.",
  },
  {
    title: "Upload your resume",
    desc: "Very important so companies can choose you faster.",
  },
  { title: "Go to the Matching tab", desc: "Search by location and sector." },
  { title: "Swipe right or left" },
  {
    title: "Keep an eye on your messages",
    desc: "Companies that match with you will send you a message.",
  },
  {
    title: "Chat live inside the app",
    desc: "Convince the company via messenger and your next opportunity is one step away.",
  },
];

const companySteps: Step[] = [
  { title: "Create your account or log in" },
  {
    title: "Fill in your company information",
    desc: "Tip: you can update your details from your dashboard.",
  },
  {
    title: "Choose your plan",
    desc: "We recommend SILVER/GOLDEN for fewer or no ads and more job posts.",
  },
  {
    title: "Upload a profile and cover photo",
    desc: "Optional, but it builds trust.",
  },
  { title: "Post your job ad", desc: "Short description – see who is interested instantly." },
  { title: "See who liked your job ad", desc: "Make a match to start the conversation." },
];

// your images in /public
const stepImages = ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg", "/7.jpg", "/8.jpg"];

export default function InfoTimeline() {
  const [audience, setAudience] = useState<"EMP" | "COM">("EMP");
  const steps = useMemo(() => (audience === "EMP" ? employeeSteps : companySteps), [audience]);

  // active card index
  const [index, setIndex] = useState(0);

  // flip state per index
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const total = steps.length;

  const imagesForAudience = useMemo(() => {
    // companies have fewer steps => use first N images
    return audience === "COM" ? stepImages.slice(0, companySteps.length) : stepImages.slice(0, employeeSteps.length);
  }, [audience]);

  const prev = () => {
    setFlipped({});
    setIndex((i) => (i - 1 + total) % total);
  };

  const next = () => {
    setFlipped({});
    setIndex((i) => (i + 1) % total);
  };

  const toggleFlip = (i: number) => {
    setFlipped((m) => ({ ...m, [i]: !m[i] }));
  };

  // we render a "deck" like the original (absolute .cards), but show 3-4 stacked
  const getRel = (i: number) => ((i - index) % total + total) % total;

  return (
    <section id="how-it-works" className="relative">
      {/* keep CSS in same file */}
      <style jsx global>{`
        /* full screen section exactly like the original demo */
        .gje-gallery {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #111;
        }

        /* header overlay (does NOT constrain width like max-w-6xl containers) */
        .gje-head {
          position: absolute;
          top: 48px;
          left: 50%;
          transform: translateX(-50%);
          width: min(980px, calc(100% - 32px));
          text-align: center;
          z-index: 50;
          color: #fff;
        }

        .gje-title {
          margin: 0;
          font-size: clamp(28px, 3.2vw, 44px);
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .gje-sub {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 14px;
        }

        .gje-toggle {
          margin: 18px auto 0;
          display: flex;
          width: min(420px, 100%);
          padding: 6px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
        }

        .gje-toggle button {
          flex: 1;
          border: 0;
          cursor: pointer;
          border-radius: 999px;
          padding: 10px 12px;
          font-weight: 800;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          background: transparent;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .gje-toggle button.active {
          background: rgba(255, 255, 255, 0.92);
          color: #111;
        }

        .gje-hint {
          margin-top: 14px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }

        /* ====== Cards deck (like original: absolute, centered) ====== */
        .gje-cards {
          perspective: 1200px;
          transform-style: preserve-3d;
          position: absolute;
          width: 20rem;
          height: 28rem;
          top: 54%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 20;
        }

        .gje-card {
          position: absolute;
          inset: 0;
          list-style: none;
          margin: 0;
          padding: 0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          transform-origin: center;
          transition: transform 380ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 380ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }

        /* stack effect */
        .rel0 {
  z-index: 6;
  transform: translate3d(0px, 0px, 0px) scale(1);
  opacity: 1;
  filter: blur(0px);
  cursor: pointer;
}
        .rel1 {
  z-index: 5;
  transform: translate3d(360px, 12px, 0px) scale(0.88) rotateY(-10deg);
  opacity: 0.55;
  filter: blur(0.6px);
  pointer-events: none;
}
        .rel2 {
  z-index: 4;
  transform: translate3d(680px, 24px, 0px) scale(0.74) rotateY(-16deg);
  opacity: 0.18;
  filter: blur(1.4px);
  pointer-events: none;
}
      .rel3 {
  z-index: 3;
  transform: translate3d(980px, 36px, 0px) scale(0.62) rotateY(-18deg);
  opacity: 0.08;
  filter: blur(2px);
  pointer-events: none;
}
  .relL1 {
  z-index: 5;
  transform: translate3d(-360px, 12px, 0px) scale(0.88) rotateY(10deg);
  opacity: 0.55;
  filter: blur(0.6px);
  pointer-events: none;
}

.relL2 {
  z-index: 4;
  transform: translate3d(-680px, 24px, 0px) scale(0.74) rotateY(16deg);
  opacity: 0.18;
  filter: blur(1.4px);
  pointer-events: none;
}

.relL3 {
  z-index: 3;
  transform: translate3d(-980px, 36px, 0px) scale(0.62) rotateY(18deg);
  opacity: 0.08;
  filter: blur(2px);
  pointer-events: none;
}

.hiddenCard {
  opacity: 0;
  transform: translate3d(0px, 60px, 0px) scale(0.6);
  pointer-events: none;
  z-index: 1;
}
        /* ===== flip ===== */
        .flip {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 650ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }
        .flip.flipped {
          transform: rotateY(180deg);
        }
        .face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
        }
        .front {
          background: #111;
        }
        .front img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: saturate(1.05) contrast(1.05);
        }
        .front::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.25), rgba(0,0,0,0.78));
        }

        .frontLabel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px 16px 18px;
          color: #fff;
          z-index: 2;
        }
        .pill {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .frontTitle {
          margin-top: 10px;
          font-size: 18px;
          font-weight: 900;
          line-height: 1.22;
          max-width: 95%;
        }
        .tapHint {
          margin-top: 10px;
          font-size: 12px;
          color: rgba(255,255,255,0.72);
        }

        .back {
          transform: rotateY(180deg);
          background:
            radial-gradient(700px 450px at 25% 15%, rgba(255,255,255,0.10), transparent 55%),
            rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }
        .backInner {
          width: 100%;
          text-align: left;
        }
        .stepText {
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.7);
        }
        .backTitle {
          margin-top: 10px;
          font-size: 20px;
          line-height: 1.25;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.95);
        }
        .backDesc {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.78);
        }

        /* actions exactly like original: bottom center absolute */
        .gje-actions {
          position: absolute;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 60;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .gje-actions button {
          outline: none;
          padding: 12px 22px;
          background: rgba(255, 255, 255, 0.06);
          border: solid 1px rgba(255, 255, 255, 0.22);
          color: rgba(255, 255, 255, 0.92);
          border-radius: 999px;
          font-weight: 900;
          cursor: pointer;
          line-height: 18px;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .gje-actions button:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.1);
        }

        .counter {
          color: rgba(255,255,255,0.65);
          font-size: 12px;
          font-weight: 800;
          margin-left: 6px;
        }

        /* mobile responsive */
        @media (max-width: 575px) {
  /* πιο μικρή κάρτα, στο κέντρο */
  .gje-cards {
    width: 18rem;
    height: 26rem;
    top: 58%;
  }

  /* στο κινητό θέλουμε ΜΟΝΟ την active */
  .rel1, .rel2, .rel3, .relL1, .relL2, .relL3 {
    opacity: 0 !important;
    transform: translate3d(0px, 40px, 0px) scale(0.92) !important;
    pointer-events: none !important;
    filter: blur(0px) !important;
  }

  .hiddenCard {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  .rel0 {
    transform: translate3d(0px, 0px, 0px) scale(1) !important;
    opacity: 1 !important;
    filter: none !important;
  }

  /* buttons λίγο πιο μεγάλα / πιο κάτω */
  .gje-actions {
    bottom: 14px;
    gap: 10px;
  }
  .gje-actions button {
    padding: 12px 18px;
  }
}
      `}</style>

      {/* FULLSCREEN gallery (like your original .gallery) */}
      <div className="gje-gallery">
        {/* Header overlay */}
        <div className="gje-head">
          <h2 className="gje-title">How it works</h2>
          <div className="gje-sub">
            See the main steps for {audience === "EMP" ? "candidates" : "companies"}.
          </div>

          <div className="gje-toggle" role="tablist" aria-label="Audience">
            <button
              type="button"
              className={audience === "EMP" ? "active" : ""}
              onClick={() => {
                setAudience("EMP");
                setIndex(0);
                setFlipped({});
              }}
              aria-pressed={audience === "EMP"}
            >
              Candidates
            </button>
            <button
              type="button"
              className={audience === "COM" ? "active" : ""}
              onClick={() => {
                setAudience("COM");
                setIndex(0);
                setFlipped({});
              }}
              aria-pressed={audience === "COM"}
            >
              Companies
            </button>
          </div>

          <div className="gje-hint">
            Tap the card to rotate • Use Prev/Next to browse
          </div>
        </div>

        {/* Cards */}
        <ul className="gje-cards" aria-label="Steps cards">
          {steps.map((s, i) => {
            const rel = getRel(i);
            let posClass = "hiddenCard";
              if (rel === 0) posClass = "rel0";
              else if (rel === 1) posClass = "rel1";
              else if (rel === 2) posClass = "rel2";
              else if (rel === 3) posClass = "rel3";
              else if (rel === total - 1) posClass = "relL1";
              else if (rel === total - 2) posClass = "relL2";
              else if (rel === total - 3) posClass = "relL3";

              const cls = `gje-card ${posClass}`;

            const img = imagesForAudience[i] ?? stepImages[0];
            const isFlipped = !!flipped[i];

            return (
              <li
                key={`${audience}-${i}`}
                className={cls}
                onClick={() => rel === 0 && toggleFlip(i)}
                role="button"
                tabIndex={rel === 0 ? 0 : -1}
                aria-label={`Step ${i + 1}: ${s.title}`}
                onKeyDown={(e) => {
                  if (rel !== 0) return;
                  if (e.key === "Enter" || e.key === " ") toggleFlip(i);
                }}
              >
                <div className={`flip ${isFlipped ? "flipped" : ""}`}>
                  {/* FRONT: image */}
                  <div className="face front">
                    <img src={img} alt="" />
                    <div className="frontLabel">
                      <span className="pill">Step {i + 1}</span>
                      <div className="frontTitle">{s.title}</div>
                      <div className="tapHint">Tap to rotate</div>
                    </div>
                  </div>

                  {/* BACK: text */}
                  <div className="face back">
                    <div className="backInner">
                      <div className="stepText">Step {i + 1}</div>
                      <div className="backTitle">{s.title}</div>
                      {s.desc ? <div className="backDesc">{s.desc}</div> : null}
                      <div className="backDesc" style={{ marginTop: 14, opacity: 0.8 }}>
                        Tap again to go back
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Actions */}
        <div className="gje-actions">
          <button type="button" onClick={prev}>Prev</button>
          <button type="button" onClick={next}>Next</button>
          <span className="counter">
            {index + 1}/{total}
          </span>
        </div>
      </div>
    </section>
  );
}

