export type LocPref = {
  placeId: string;
  description: string;        // π.χ. "Thessaloniki, Greece"
  lat?: number;
  lng?: number;
  countryCode?: string | null; // επέτρεψε και null για ασφάλεια
};