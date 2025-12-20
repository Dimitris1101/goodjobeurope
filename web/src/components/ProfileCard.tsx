type Skill = { name: string };

type Props = {
  badge?: string;                 // π.χ. "PRO"
  avatarUrl?: string;             // url εικόνας
  name: string;
  location?: string;
  headline?: string;              // π.χ. "UI/UX & Front-end dev"
  skills?: Skill[];
  primaryCta?: { label: string; onClick?: () => void; href?: string };
  secondaryCta?: { label: string; onClick?: () => void; href?: string };
};


const DEFAULT_AVATAR = '/avatar-placeholder.png'; // βάλε ένα placeholder asset

export default function ProfileCard({
  badge,
  avatarUrl,
  name,
  location,
  headline,
  skills = [],
  primaryCta,
  secondaryCta,
}: Props) {
  return (
    <section className="w-full max-w-sm text-center rounded-xl bg-[#231E39] text-[#B3B8CD] shadow-[0_10px_20px_-10px_rgba(0,0,0,0.75)] pt-8 relative mx-auto">
      {!!badge && (
        <span className="absolute left-5 top-5 rounded bg-[#FEBB0B] px-2 py-0.5 text-xs font-bold text-[#231E39]">
          {badge}
        </span>
      )}

      <div className="mx-auto h-28 w-28 rounded-full border border-[#03BFCB] p-[7px]">
        <div className="relative h-full w-full overflow-hidden rounded-full">
          <img
            src={avatarUrl || DEFAULT_AVATAR}
            alt={`${name} avatar`}
            className="h-full w-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }}
          />
        </div>
      </div>

      <h3 className="mt-3 text-lg font-semibold text-white">{name}</h3>

      {!!location && (
        <h6 className="mt-1 text-[11px] uppercase tracking-wide text-[#B3B8CD]">
          {location}
        </h6>
      )}

      {!!headline && (
        <p className="mx-auto mt-3 max-w-[260px] text-[13px] leading-5">
          {headline}
        </p>
      )}

      <div className="mt-4 flex items-center justify-center gap-3 px-5">
        {primaryCta && (primaryCta.href ? (
          <a
            href={primaryCta.href}
            className="rounded bg-[#03BFCB] px-4 py-2 text-sm font-medium text-[#231E39] border border-[#03BFCB]"
          >
            {primaryCta.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={primaryCta.onClick}
            className="rounded bg-[#03BFCB] px-4 py-2 text-sm font-medium text-[#231E39] border border-[#03BFCB]"
          >
            {primaryCta.label}
          </button>
        ))}

        {secondaryCta && (secondaryCta.href ? (
          <a
            href={secondaryCta.href}
            className="rounded border border-[#03BFCB] px-4 py-2 text-sm font-medium text-[#02899C] bg-transparent"
          >
            {secondaryCta.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={secondaryCta.onClick}
            className="rounded border border-[#03BFCB] px-4 py-2 text-sm font-medium text-[#02899C] bg-transparent"
          >
            {secondaryCta.label}
          </button>
        ))}
      </div>

      {!!skills.length && (
        <div className="mt-6 w-full bg-[#1F1A36] text-left px-4 py-4 rounded-b-xl">
          <h6 className="mb-2 text-[11px] uppercase tracking-wide">Skills</h6>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s.name}
                className="inline-block rounded border border-[#2D2747] px-2 py-1 text-[11px]"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
} 