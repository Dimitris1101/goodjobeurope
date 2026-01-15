"use client";

type Card = {
  title: string;
  author?: string;
  href?: string;
  img: string;
  short?: boolean;
};

const CARDS: Card[] = [
  {
    title: "Welcome to GOODJOBEUROPE",
    author: "GoodJobEurope",
    href: "#",
    img: "/about1.jpg",
  },
  {
    title: "Find a job based on location & industry",
    author: "GoodJobEurope",
    href: "#",
    img: "/about2.jpg",
    short: true,
  },
  {
    title: "Create a profile that makes you stand out",
    author: "GoodJobEurope",
    href: "#",
    img: "/about3.jpg",
  },
  {
    title: "Match & chat live in to the",
    author: "GoodJobEurope",
    href: "#",
    img: "/about4.jpg",
  },
  {
    title: "Companies find candidates quickly",
    author: "GoodJobEurope",
    href: "#",
    img: "/about5.jpg",
    short: true,
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="pa-wrap">
      <style jsx global>{`
        :root {
          --pa-bg: #f5f5f5;
          --pa-gap: 10px;
          --pa-row: 240px;
          --pa-tall: calc(var(--pa-row) * 2 + var(--pa-gap));
          --pa-mobile-h: 380px;
        }

        .pa-wrap {
          background: var(--pa-bg);
          padding: 24px 0;
        }

        .pa-container {
          margin: calc(var(--pa-gap) / 2) auto;
          max-width: 1440px;
          padding: 0 12px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .pa-grid {
          overflow: hidden;
          padding: calc(var(--pa-gap) / 2) var(--pa-gap);
          display: grid;
          gap: var(--pa-gap);
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(4, var(--pa-row));
          grid-template-areas:
            "a1 a2"
            "a1 a4"
            "a3 a4"
            "a3 a5";
          border-radius: 18px;
          background: var(--pa-bg);
        }

        .pa-article {
          position: relative;
          display: block;
          border-radius: 16px;
          overflow: hidden;
          background: #000;
          text-decoration: none;
          outline: none;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
          transform: translateZ(0);
        }

        /* heights */
        .pa-article.tall {
          height: var(--pa-tall);
        }
        .pa-article.short {
          height: var(--pa-row);
        }

        /* grid areas */
        .pa-article.area-1 { grid-area: a1; }
        .pa-article.area-2 { grid-area: a2; }
        .pa-article.area-3 { grid-area: a3; }
        .pa-article.area-4 { grid-area: a4; }
        .pa-article.area-5 { grid-area: a5; }

        .pa-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.55;
          transform: scale(1.02);
          transition: transform 520ms ease, opacity 520ms ease;
          display: block;
        }

        /* subtle gradient overlay */
        .pa-article::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.78) 0%,
            rgba(0, 0, 0, 0.25) 55%,
            rgba(0, 0, 0, 0.12) 100%
          );
          pointer-events: none;
        }

        .pa-content {
          position: absolute;
          right: 5rem;
          bottom: 0.75rem;
          left: 1.25rem;
          z-index: 2;
        }

        .pa-title {
          margin: 0;
          color: rgba(255, 255, 255, 0.8);
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          font-weight: 900;
          letter-spacing: -0.02em;
          font-size: 2rem;
          line-height: 1.1;
          transition: color 240ms ease;
        }

        .pa-footer {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
        }

        .pa-author {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          line-height: 1;
          backdrop-filter: blur(8px);
        }

        .pa-author em {
          opacity: 0.7;
          font-style: italic;
          margin-right: 6px;
        }

        .pa-article:hover .pa-img,
        .pa-article:focus-visible .pa-img {
          transform: scale(1.07);
          opacity: 0.68;
        }
        .pa-article:hover .pa-title,
        .pa-article:focus-visible .pa-title {
          color: #fff;
        }

        /* ===== responsive ===== */
        @media (max-width: 900px) {
          .pa-grid {
            display: block;
            padding: calc(var(--pa-gap) / 2) 0 0;
            border-radius: 0;
          }

          .pa-article {
            width: 100%;
            margin: 0 0 var(--pa-gap) 0;
            border-radius: 18px;
          }

          .pa-article.tall,
          .pa-article.short {
            height: var(--pa-mobile-h);
          }

          .pa-content {
            right: 2rem;
            left: 1.25rem;
            bottom: 0.75rem;
          }

          .pa-title {
            font-size: 1.7rem;
          }
        }

        @media (max-width: 600px) {
          :root { --pa-mobile-h: 340px; }
          .pa-content { right: 1.25rem; left: 1rem; }
          .pa-title { font-size: 1.45rem; }
        }
      `}</style>

      <div className="pa-container">
        <div className="pa-grid" aria-label="About / promoted articles">
          {CARDS.map((c, idx) => {
            const area = idx + 1; // 1..5
            const heightClass = c.short ? "short" : "tall";
            return (
              <a
                key={idx}
                href={c.href ?? "#"}
                className={`pa-article area-${area} ${heightClass}`}
              >
                <img className="pa-img" src={c.img} alt="" />
                <div className="pa-content">
                  <h2 className="pa-title">{c.title}</h2>
                  {c.author ? (
                    <div className="pa-footer">
                      <span className="pa-author">
                        <em>by</em> {c.author}
                      </span>
                    </div>
                  ) : null}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

