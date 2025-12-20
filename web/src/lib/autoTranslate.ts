type CacheMap = Record<string, string>; // original -> translated
const CACHE_KEY = (lang: string) => `autoTranslateCache:${lang}`;

function loadCache(lang: string): CacheMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY(lang));
    return raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    return {};
  }
}
function saveCache(lang: string, cache: CacheMap) {
  try {
    localStorage.setItem(CACHE_KEY(lang), JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

function decodeHtml(str: string) {
  const d = document.createElement('textarea');
  d.innerHTML = str;
  return d.value;
}

const IGNORE_SELECTOR =
  'script,style,noscript,code,pre,textarea,input,select,option,[data-no-auto-translate],[data-no-translate],.notranslate';

function collectTextNodes(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Node): number => {
      const parent = (node.parentElement ?? null);
      if (!parent) return NodeFilter.FILTER_REJECT;

      // αγνόησε συγκεκριμένα containers
      if (parent.closest(IGNORE_SELECTOR)) return NodeFilter.FILTER_REJECT;

      const txt = (node.nodeValue ?? '').replace(/\s+/g, ' ').trim();
      if (!txt) return NodeFilter.FILTER_REJECT;

      // μην ξαναμεταφράσεις αυτό που ήδη μαρκάραμε
      if (parent.hasAttribute('data-auto-translated')) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let cur = walker.nextNode();
  while (cur) {
    out.push(cur as Text);
    cur = walker.nextNode();
  }
  return out;
}

async function translateBatch(
  apiBase: string,
  texts: string[],
  target: string,
  source?: string
): Promise<string[]> {
  const url = `${apiBase.replace(/\/+$/, '')}/translate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, target, source }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`translate failed: ${res.status} ${t}`);
  }
  const json = (await res.json()) as { translated?: string[] };
  const arr = Array.isArray(json?.translated) ? json.translated : [];
  return arr.map((s) => decodeHtml(s));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function autoTranslatePage(opts: {
  lang: string;
  apiBase?: string;
  source?: string;    // άφησέ το undefined για auto-detect
  chunkSize?: number; // default 100 (limit Google 128)
}) {
  const {
    lang,
    apiBase = process.env.NEXT_PUBLIC_API_URL ?? '',
    source,
    chunkSize = 100,
  } = opts;

  if (!lang) return;
  // αν ο χρήστης θέλει 'el' (native UI), φύγε
  if (lang.toLowerCase() === 'en') return;

  const root = (document.getElementById('__next') || document.body) as HTMLElement;
  const nodes = collectTextNodes(root);
  if (!nodes.length) return;

  // μοναδικοποίησε
  const originals = Array.from(
    new Set(nodes.map((n) => (n.nodeValue ?? '').replace(/\s+/g, ' ').trim()))
  );

  // φόρτωσε cache
  const cache = loadCache(lang);

  // ποια δεν υπάρχουν ήδη μεταφρασμένα στην cache
  const toTranslate = originals.filter((t) => !(t in cache));
  if (toTranslate.length) {
    const batches = chunk(toTranslate, Math.max(1, Math.min(128, chunkSize)));
    for (const batch of batches) {
      try {
        const translated = await translateBatch(apiBase, batch, lang, source);
        for (let i = 0; i < batch.length; i++) {
          cache[batch[i]] = translated[i] ?? '';
        }
        saveCache(lang, cache);
      } catch {
        // αν αποτύχει ένα batch, σταμάτα αθόρυβα (θα μείνουν original)
        break;
      }
    }
  }

  // αντικατάσταση στο DOM + φύλαξε το original
  nodes.forEach((textNode) => {
    const parent = textNode.parentElement;
    if (!parent) return;

    const orig = (textNode.nodeValue ?? '').replace(/\s+/g, ' ').trim();
    const repl = cache[orig];
    if (!repl) return;

    if (!parent.hasAttribute('data-orig-text')) {
      parent.setAttribute('data-orig-text', textNode.nodeValue ?? '');
    }
    parent.setAttribute('data-auto-translated', '1');
    textNode.nodeValue = repl;
  });
}
