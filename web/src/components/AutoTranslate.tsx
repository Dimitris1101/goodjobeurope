// C:\job-matching\web\src\components\AutoTranslate.tsx
'use client';

import { useEffect } from 'react';
import api from '@/lib/api';

type CacheMap = Record<string, string>; // original -> translated

const IGNORE_SELECTOR =
  'script,style,noscript,code,pre,textarea,input,select,option,[data-no-translate],.notranslate';
const CACHE_KEY = (lang: string) => `autoTranslateCache:${lang}`;
const CHUNK_SIZE = 100;

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
    /* ignore */
  }
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function decodeHtml(str: string): string {
  const d = document.createElement('textarea');
  d.innerHTML = str;
  return d.value;
}

function collectTextNodes(root: HTMLElement): { nodes: Text[]; originals: string[] } {
  const nodes: Text[] = [];
  const originals: string[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Node): number => {
      const parent = node.parentElement ?? null;
      if (!parent) return NodeFilter.FILTER_REJECT;

      // 🔒 Skip ό,τι είναι κάτω από data-no-translate κλπ
      if (parent.closest(IGNORE_SELECTOR)) return NodeFilter.FILTER_REJECT;

      const raw = node.nodeValue ?? '';
      const text = normalizeText(raw);
      if (!text) return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    const tn = current as Text;
    const raw = tn.nodeValue ?? '';
    const norm = normalizeText(raw);
    if (norm) {
      nodes.push(tn);
      originals.push(norm);
    }
    current = walker.nextNode();
  }

  return { nodes, originals };
}

async function translateChunk(texts: string[], target: string): Promise<string[]> {
  const res = await api.post<{ translated: string[] }>('/translate', { texts, target });
  const arr = Array.isArray(res.data?.translated) ? res.data.translated : [];
  return arr.map((s) => decodeHtml(s));
}

async function translateBatch(texts: string[], target: string): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    const part = texts.slice(i, i + CHUNK_SIZE);
    const tr = await translateChunk(part, target);
    out.push(...tr);
  }
  while (out.length < texts.length) out.push('');
  return out.slice(0, texts.length);
}

async function translatePageTo(lang: string): Promise<void> {
  if (!lang || lang.toLowerCase() === 'en') return;

  await new Promise((r) => setTimeout(r, 120));

  const root = (document.getElementById('__next') || document.body) as HTMLElement;
  const { nodes, originals } = collectTextNodes(root);
  if (!nodes.length) return;

  const unique = Array.from(new Set(originals));
  const cache = loadCache(lang);
  const missing = unique.filter((t) => !(t in cache));

  if (missing.length) {
    try {
      const translated = await translateBatch(missing, lang);
      for (let i = 0; i < missing.length; i += 1) {
        cache[missing[i]] = translated[i] ?? '';
      }
      saveCache(lang, cache);
    } catch {
      return;
    }
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const textNode = nodes[i];
    const parent = textNode.parentElement;
    if (!parent) continue;

    const origNorm = originals[i];
    const translated = cache[origNorm];
    if (!translated) continue;

    textNode.nodeValue = translated;
  }
}

export default function AutoTranslate() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 🔑 ΜΟΝΟ αυτό: ποια γλώσσα θέλει να βλέπει ΤΩΡΑ ο χρήστης
    const viewLang =
      (
        localStorage.getItem('ui.viewLang') ||          // τρέχουσα επιλογή (dropdown)
        localStorage.getItem('ui.accountLang') ||       // από register
        localStorage.getItem('uiAccountLang') ||        // παλιό
        localStorage.getItem('uiLanguage') ||           // πολύ παλιό cookie μεταφερμένο σε LS
        'en'
      ).toLowerCase();

    if (!viewLang || viewLang === 'en') {
      return; // original English → δεν μεταφράζουμε τίποτα
    }

    void translatePageTo(viewLang);
  }, []);

  return null;
}
