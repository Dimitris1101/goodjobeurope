export type CompanyUpdatePayload = {
  name?: string;
  country?: string;
  website?: string;
  about?: string;
  phone?: string;
  heading?: string;
  address?: string;
  logoUrl?: string;
};

export function toCompanyPayload(src: any): CompanyUpdatePayload {
  return {
    name: src?.name,
    country: src?.country,
    website: src?.website,
    about: src?.about,
    phone: src?.phone,
    heading: src?.heading,
    address: src?.address,
    logoUrl: src?.logoUrl,
  };
}