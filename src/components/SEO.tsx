import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = "https://wixotel.com";
const DEFAULT_TITLE = "WIXOTEL - Hotel Management Platform";
const DEFAULT_DESCRIPTION = "The complete platform for modern hotel management. Manage rooms, bookings, and guests efficiently.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/images/hotelhub-logo-hd.png`;

export const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
  jsonLd,
}: SEOProps) => {
  const fullTitle = title ? `${title} | WIXOTEL` : DEFAULT_TITLE;
  const fullCanonicalUrl = canonicalUrl ? `${BASE_URL}${canonicalUrl}` : undefined;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />

      {/* Canonical URL */}
      {fullCanonicalUrl && <link rel="canonical" href={fullCanonicalUrl} />}

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {fullCanonicalUrl && <meta property="og:url" content={fullCanonicalUrl} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="WIXOTEL" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

// Helper function to create Hotel JSON-LD schema
export const createHotelJsonLd = (hotel: {
  name: string;
  description?: string | null;
  address: string;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[] | null;
  avgRating?: number;
  reviewCount?: number;
}) => {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    description: hotel.description || `Welcome to ${hotel.name}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.address,
      addressLocality: hotel.city || undefined,
      addressCountry: hotel.country || undefined,
    },
  };

  if (hotel.phone) {
    jsonLd.telephone = hotel.phone;
  }

  if (hotel.email) {
    jsonLd.email = hotel.email;
  }

  if (hotel.latitude && hotel.longitude) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: hotel.latitude,
      longitude: hotel.longitude,
    };
  }

  if (hotel.images && hotel.images.length > 0) {
    jsonLd.image = hotel.images;
  }

  if (hotel.avgRating && hotel.reviewCount) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: hotel.avgRating.toFixed(1),
      reviewCount: hotel.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
};

// Helper function to create WebSite JSON-LD for landing page
export const createWebsiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "WIXOTEL",
  url: "https://wixotel.com",
  description: DEFAULT_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://wixotel.com/hotels?search={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
});

// Helper function to create Organization JSON-LD
export const createOrganizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "WIXOTEL",
  url: "https://wixotel.com",
  logo: `${BASE_URL}/images/hotelhub-logo-hd.png`,
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@wixotel.com",
  },
});

// Helper function to create ItemList JSON-LD for hotels listing
export const createHotelsListJsonLd = (hotels: Array<{
  name: string;
  slug: string;
  description?: string | null;
  images?: string[] | null;
}>) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: hotels.slice(0, 10).map((hotel, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Hotel",
      name: hotel.name,
      url: `https://wixotel.com/hotel/${hotel.slug}`,
      description: hotel.description || `Welcome to ${hotel.name}`,
      image: hotel.images?.[0] || undefined,
    },
  })),
});
