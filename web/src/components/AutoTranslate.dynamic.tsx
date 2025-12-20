'use client';

import dynamic from "next/dynamic";

// φορτώνει το AutoTranslate *μόνο* στο client, ποτέ στο SSR
const AutoTranslate = dynamic(() => import("./AutoTranslate"), {
  ssr: false,
});

export default AutoTranslate;
