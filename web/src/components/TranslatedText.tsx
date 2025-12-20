// C:\job-matching\web\src\components\TranslatedText.tsx
'use client';
import { useState } from 'react';

type Props = {
  source: string;
  translated: string;
  className?: string;
};

export default function TranslatedText({ source, translated, className }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch {}
  };

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showOriginal}
            onChange={e => setShowOriginal(e.target.checked)}
          />
          Show original
        </label>
        <button
          type="button"
          onClick={copy}
          className="rounded border px-2 py-0.5 text-xs"
          title="Copy original text"
        >
          Copy original
        </button>
      </div>
      <div className="rounded-lg border bg-white/80 p-3 text-black whitespace-pre-wrap">
        {showOriginal ? source : translated}
      </div>
    </div>
  );
}
