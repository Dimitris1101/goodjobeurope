// C:\job-matching\api\src\translation\translation.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';

type Provider = 'DEEPL' | 'GOOGLE_V2';

type TranslateOpts = {
  texts: string[];
  target: string;
  source?: string;
  provider?: Provider;
  formality?: 'default' | 'more' | 'less'; // DeepL μόνο
  // glossaryId?: string; // Δεν υποστηρίζεται στη Google v2
};

@Injectable()
export class TranslationService {
  // ENV
  private deeplKey = process.env.DEEPL_API_KEY;              // https://api.deepl.com/v2/translate
  private gKey = process.env.GOOGLE_TRANSLATE_API_KEY;       // Google Translate v2 API key

  async translateBatch(opts: TranslateOpts): Promise<string[]> {
    const provider: Provider =
      opts.provider ?? (this.supportsDeepL(opts.target) ? 'DEEPL' : 'GOOGLE_V2');

    if (!opts?.texts?.length) return [];

    let translated: string[] = [];
    if (provider === 'DEEPL' && this.deeplKey) {
      translated = await this.deeplTranslate(opts);
    } else {
      translated = await this.googleV2Translate(opts);
    }

    return translated;
  }

  private supportsDeepL(lang: string) {
    // DeepL supported target languages (ενδεικτικά, βάλε όσες χρειάζεσαι)
    const supported = [
      'en','el','de','fr','it','es','pt','nl','pl','sv','da','fi','cs','ro','bg','hu'
    ];
    return supported.includes((lang || '').toLowerCase());
  }

  /** -------- DeepL (v2) ---------- */
  private async deeplTranslate({ texts, source, target, formality }: TranslateOpts) {
    if (!this.deeplKey) throw new InternalServerErrorException('Missing DEEPL_API_KEY');
    if (!texts?.length) return [];

    // DeepL limit: ~50 texts/request είναι ασφαλές
    const chunks = this.chunk(texts, 50);
    const out: string[] = [];

    for (const chunk of chunks) {
      const params = new URLSearchParams();
      chunk.forEach(t => params.append('text', t ?? ''));
      params.append('target_lang', target.toUpperCase());
      if (source) params.append('source_lang', source.toUpperCase());
      if (formality && formality !== 'default') {
        params.append('formality', formality === 'more' ? 'more' : 'less');
      }

      const res = await fetch('https://api.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.deeplKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('DeepL error:', res.status, txt);
        throw new InternalServerErrorException(`DeepL error: ${res.status} ${txt}`);
      }

      const json = await res.json() as any;
      const part = (json?.translations ?? []).map((x: any) => x.text ?? '');
      out.push(...part);
    }

    return this.padTo(texts.length, out);
  }

  /** -------- Google Translate v2 (με API key) ---------- */
  private async googleV2Translate({ texts, source, target }: TranslateOpts) {
    if (!this.gKey) throw new InternalServerErrorException('Missing GOOGLE_TRANSLATE_API_KEY');
    if (!texts?.length) return [];

    // v2 αποδέχεται πολλά q στο ίδιο request. 100–128 είναι ασφαλές όριο.
    const chunks = this.chunk(texts, 128);
    const out: string[] = [];

    for (const chunk of chunks) {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${this.gKey}`;

      // v2 body: q[], target, (optional) source, (optional) format
      const body: any = {
        q: chunk,
        target,
        format: 'text',
      };
      if (source) body.source = source;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Αν αποτύχει, προσπάθησε να διαβάσεις JSON error για να δώσεις καθαρό μήνυμα
      if (!res.ok) {
        let errText = '';
        try {
          const errJson = await res.json();
          errText = JSON.stringify(errJson);
        } catch {
          errText = await res.text().catch(() => '');
        }
        console.error('Google v2 error:', res.status, errText);
        throw new InternalServerErrorException(`Google Translate v2 error: ${res.status} ${errText}`);
      }

      const data = await res.json() as any;

      // v2 επιτυχία: data.data.translations = [{translatedText: "..."}]
      const translations = data?.data?.translations;
      if (!Array.isArray(translations)) {
        console.error('Google v2 unexpected payload:', JSON.stringify(data));
        throw new InternalServerErrorException('Google Translate v2: unexpected response payload');
      }

      const part: string[] = translations.map((t: any) => t?.translatedText ?? '');
      out.push(...part);
    }

    return this.padTo(texts.length, out);
  }

  /** -------- Helpers ---------- */
  private chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  private padTo(n: number, arr: string[]) {
    const out = [...arr];
    while (out.length < n) out.push('');
    return out.slice(0, n);
  }
}
