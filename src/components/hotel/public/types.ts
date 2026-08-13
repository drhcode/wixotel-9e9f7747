export interface PublicHotel {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  description: string | null;
  about_us: string | null;
  about_us_image: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_business_url: string | null;
  amenities: string[] | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  images: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface PublicRoom {
  id: string;
  name: string;
  room_number: string | null;
  room_type: string | null;
  price: number;
  capacity: number;
  description: string | null;
  main_photo_url: string | null;
  square_meters: number | null;
  amenities: string[] | null;
  is_available: boolean;
  images: string[] | null;
}

export interface PublicReview {
  id: string;
  hotel_id: string;
  title: string;
  rating: number;
  review_text: string;
  photo_url: string | null;
  status: string;
  created_at: string;
}

/** Strips internal room-number prefixes/suffixes for public display. */
export const cleanRoomName = (name: string) => {
  // Remove pattern like "105 - " or "A1 - " from the beginning
  let cleaned = name.replace(/^[A-Z0-9]+\s*-\s*/i, "");
  // Remove ALL parenthetical content like "(flutura)" anywhere in the string
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, "");
  // Remove trailing numbers like "203"
  cleaned = cleaned.replace(/\s*\d+\s*$/, "");
  return cleaned.trim();
};
