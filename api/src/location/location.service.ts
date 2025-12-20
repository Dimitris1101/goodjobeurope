import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

type PlaceResult = {
  placeId: string;
  fullText: string;
  lat: number;
  lng: number;
  city?: string | null;
  adminArea?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
};

function pick(from: any[], type: string) {
  return from?.find((c) => c.types?.includes(type));
}

@Injectable()
export class LocationService {
  async resolvePlaceId(placeId: string): Promise<PlaceResult> {
    if (!placeId) throw new BadRequestException('Missing placeId');

    const key = process.env.GOOGLE_MAPS_KEY;
    if (!key) throw new ServiceUnavailableException('Missing GOOGLE_MAPS_KEY');

    try {
      const { data } = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          key,
          place_id: placeId,
          fields: 'place_id,formatted_address,address_component,geometry',
        },
        timeout: 8000,
      });

      if (data?.status !== 'OK') {
        // Πέρνα καθαρό μήνυμα προς τα έξω, όχι 500
        const msg = `Places API: ${data?.status || 'ERROR'}${data?.error_message ? ` - ${data.error_message}` : ''}`;
        throw new BadRequestException(msg);
      }

      const res = data.result;
      const comps = res.address_components || [];

      const locality     = pick(comps, 'locality') || pick(comps, 'postal_town');
      const admin1       = pick(comps, 'administrative_area_level_1');
      const country      = pick(comps, 'country');

      const out: PlaceResult = {
        placeId: res.place_id,
        fullText: res.formatted_address,
        lat: res.geometry?.location?.lat ?? null,
        lng: res.geometry?.location?.lng ?? null,
        city: locality?.long_name || null,
        adminArea: admin1?.long_name || null,
        countryCode: country?.short_name || null,
        countryName: country?.long_name || null,
      };

      if (out.lat == null || out.lng == null) {
        throw new BadRequestException('Place has no geometry');
      }
      return out;
    } catch (err: any) {
      // axios/network errors
      if (err?.response?.data?.error_message) {
        throw new BadRequestException(`Places API: ${err.response.data.error_message}`);
      }
      if (err?.isAxiosError) {
        throw new ServiceUnavailableException('Places API unreachable');
      }
      throw err;
    }
  }
}