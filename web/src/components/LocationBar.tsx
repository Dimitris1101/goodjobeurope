'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';
import api from '@/lib/api';
import type { LocPref } from '@/types/location';

// Type for THIS component only (what backend returns)
type LocationRow = {
  id: number;
  placeId: string;
  description?: string;
  text: string;
  city?: string | null;
  admin?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  lat: number;
  lng: number;
};

type Props = {
  max?: number;
  onChange?: (list: LocPref[]) => void; // parent receives compact type
};

function extractFromPlace(place: google.maps.places.PlaceResult) {
  const comps = place.address_components || [];
  const get = (type: string) => comps.find(c => c.types.includes(type));
  const city =
    get('locality')?.long_name ||
    get('postal_town')?.long_name ||
    '';
  const admin = get('administrative_area_level_1')?.long_name || '';
  const country = get('country');
  const countryCode = country?.short_name || '';
  const countryName = country?.long_name || '';
  const text =
    place.formatted_address ||
    [city, countryName].filter(Boolean).join(', ');
  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();

  return {
    placeId: place.place_id!,
    text,
    city,
    admin,
    countryCode,
    countryName,
    lat: lat ?? 0,
    lng: lng ?? 0,
  };
}

function extractFromGeocode(r: google.maps.GeocoderResult) {
  const comps = r.address_components || [];
  const get = (type: string) => comps.find(c => c.types.includes(type));
  const city =
    get('locality')?.long_name ||
    get('postal_town')?.long_name ||
    '';
  const admin = get('administrative_area_level_1')?.long_name || '';
  const country = get('country');
  const countryCode = country?.short_name || '';
  const countryName = country?.long_name || '';
  const text =
    r.formatted_address ||
    [city, countryName].filter(Boolean).join(', ');
  const lat = r.geometry?.location?.lat();
  const lng = r.geometry?.location?.lng();

  return {
    placeId: (r as any).place_id as string,
    text,
    city,
    admin,
    countryCode,
    countryName,
    lat: lat ?? 0,
    lng: lng ?? 0,
  };
}

export default function LocationBar({ max = 3, onChange }: Props) {
  const [gmReady, setGmReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<LocationRow[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const listLenRef = useRef(0);

  useEffect(() => {
    listLenRef.current = list.length;
  }, [list.length]);

  // Load saved locations (parent will be updated via effect below)
  useEffect(() => {
    api.get<LocationRow[]>('/me/candidate/locations').then(({ data }) => {
      const arr = Array.isArray(data) ? data : [];
      setList(arr);
    });
  }, []);

  // Always notify parent when list changes
  useEffect(() => {
    if (!onChange) return;
    const compact: LocPref[] = list.map(row => ({
      placeId: row.placeId,
      description: row.text || row.description || '',
      lat: row.lat,
      lng: row.lng,
      countryCode: row.countryCode ?? null,
    }));
    onChange(compact);
  }, [list, onChange]);

  // Google Maps loader
  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (mounted) setGmReady(true);
      })
      .catch(() => {
        /* optional log */
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Autocomplete
  useEffect(() => {
    if (!gmReady || !inputRef.current || !window.google?.maps?.places) return;
    if (acRef.current) return;

    const input = inputRef.current;
    input.setAttribute('autocomplete', 'off');

    const ac = new google.maps.places.Autocomplete(input, {
      fields: ['place_id', 'formatted_address', 'address_components', 'geometry'],
      types: ['(cities)'],
    });
    acRef.current = ac;

    const listener = ac.addListener('place_changed', async () => {
      const place = ac.getPlace();
      if (!place?.place_id || !place.geometry) return;

      if (listLenRef.current >= max) {
        input.value = '';
        input.focus();
        return;
      }

      const payload = extractFromPlace(place);
      try {
        const { data: created } = await api.post<LocationRow>(
          '/me/candidate/locations',
          payload,
        );
        setList(prev => [
          created,
          ...prev.filter(x => x.placeId !== created.placeId),
        ]);
      } catch (e: any) {
        alert(e?.response?.data?.message ?? 'Failed to save location.');
      } finally {
        input.value = '';
        input.focus();
      }
    });

    return () => listener.remove();
  }, [gmReady, max]);

  const remove = async (id: number) => {
    try {
      await api.delete(`/me/candidate/locations/${id}`);
      setList(prev => prev.filter(x => x.id !== id));
      inputRef.current?.focus();
    } catch {
      alert('Failed to delete location.');
    }
  };

  const manualAdd = async () => {
    const input = inputRef.current;
    if (!gmReady || !input) return;

    const text = input.value.trim();
    if (!text) return;
    if (list.length >= max) {
      input.value = '';
      input.focus();
      return;
    }

    setSaving(true);
    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: text }, async (results, status) => {
        setSaving(false);
        if (status !== 'OK' || !results?.length) {
          alert('City not found. Please select from the suggestions.');
          return;
        }
        const candidate =
          results.find(
            r =>
              r.types.includes('locality') ||
              r.types.includes('postal_town'),
          ) || results[0];

        const payload = extractFromGeocode(candidate);
        if (!payload.placeId || !payload.lat || !payload.lng) {
          alert('The selected place has invalid location data.');
          return;
        }

        try {
          const { data: created } = await api.post<LocationRow>(
            '/me/candidate/locations',
            payload,
          );
          setList(prev => [
            created,
            ...prev.filter(x => x.placeId !== created.placeId),
          ]);
        } catch (e: any) {
          alert(e?.response?.data?.message ?? 'Failed to save location.');
        } finally {
          input.value = '';
          input.focus();
        }
      });
    } catch {
      setSaving(false);
      alert('Something went wrong while searching for the location.');
    }
  };

  return (
    <div className="rounded-2xl border border-white/30 bg-black/50 p-4 text-white">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm opacity-90">
          Add cities you are interested in
        </div>
        <div className="text-xs rounded bg-white/15 px-2 py-0.5">
          {list.length}/{max}
        </div>
      </div>

      {/* INPUT + BUTTON (responsive) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-base outline-none placeholder-white/50"
          placeholder="Type a city (Google Places)…"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              manualAdd();
            }
          }}
        />
        <button
          type="button"
          onClick={manualAdd}
          disabled={!gmReady || saving || list.length >= max}
          className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60 sm:w-auto sm:shrink-0"
          title={
            list.length >= max
              ? `You reached the limit (${max})`
              : 'Add location'
          }
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>

      {/* Chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {list.map(loc => (
          <span
            key={loc.id}
            className="inline-flex items-center gap-2 rounded-full bg-white text-black px-3 py-1 text-sm"
            title={loc.text || loc.description}
          >
            {loc.city ? loc.city : loc.text || loc.description}
            {loc.countryCode ? (
              <span className="opacity-70">· {loc.countryCode}</span>
            ) : null}
            <button
              onClick={() => remove(loc.id)}
              className="ml-1 rounded-full bg-black/10 px-2 text-black hover:bg-black/20"
              aria-label="Remove location"
              title="Remove"
            >
              ×
            </button>
          </span>
        ))}
        {!list.length && (
          <span className="text-sm text-white/60">No locations yet…</span>
        )}
      </div>
    </div>
  );
}
