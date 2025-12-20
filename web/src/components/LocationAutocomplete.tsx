"use client";
import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

type Props = {
  value?: { placeId: string; description: string } | null;
  onSelect: (p: { placeId: string; description: string }) => void;
  placeholder?: string;
};

export default function LocationAutocomplete({ value, onSelect, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
    let ac: google.maps.places.Autocomplete | null = null;
    let listener: google.maps.MapsEventListener | null = null;

    loadGoogleMaps()
      .then((g) => {
        if (!inputRef.current) return;
        ac = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["place_id", "formatted_address", "address_components", "geometry"],
          // types: ["(cities)"], // προαιρετικό
        });
        listener = ac.addListener("place_changed", () => {
          const place = ac!.getPlace();
          if (!place.place_id || !place.formatted_address) return;
          onSelect({ placeId: place.place_id, description: place.formatted_address });
        });
      })
      .catch(() => {
        /* προαιρετικό: log */
      });

    return () => {
      if (listener) listener.remove();
      // δεν χρειάζεται clearInstanceListeners όταν αφαιρείς το listener
      ac = null;
    };
  }, [onSelect]);

  return (
    <input
      ref={inputRef}
      defaultValue={value?.description ?? ""}
      placeholder={placeholder ?? "Πληκτρολόγησε και διάλεξε τοποθεσία…"}
      className="mt-1 w-full rounded-xl border px-3 py-2"
      autoComplete="off"
    />
  );
}