import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let mapsPromise: Promise<typeof google> | null = null;

type LoadOpts = {
  language?: string;
  region?: string;
};

export function loadGoogleMaps(opts: LoadOpts = {}): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps must run in the browser"));
  }

  if ((window as any).google?.maps?.places) {
    return Promise.resolve((window as any).google as typeof google);
  }

  if (!mapsPromise) {
    mapsPromise = (async () => {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (!key) throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY");

      setOptions({
        key,
        v: "weekly",
        language: opts.language ?? "el",
        region: opts.region ?? "GR",
      });

      await importLibrary("maps");
      await importLibrary("places");
      return (window as any).google as typeof google;
    })();
  }

  return mapsPromise;
}