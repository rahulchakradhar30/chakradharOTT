import { buildBaseMetadata, absoluteUrl, jsonLdScript } from "@/lib/seo";
import PricingClient from "./PricingClient";

export const metadata = buildBaseMetadata({
  title: "Subscription Plans & Pricing – Chakradhar Stream",
  description: "Explore our flexible Free, Premium, and Pro subscription plans. Unlock high-definition streaming, co-watching lobbies, and AI recommendations.",
  path: "/pricing",
});

const pricingOfferJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Chakradhar Stream Membership",
  "description": "Premium OTT streaming service subscription plans.",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "INR",
    "lowPrice": "0",
    "highPrice": "299",
    "offerCount": "3",
    "offers": [
      {
        "@type": "Offer",
        "name": "Free Plan",
        "price": "0",
        "priceCurrency": "INR",
        "url": absoluteUrl("/pricing"),
      },
      {
        "@type": "Offer",
        "name": "Premium Plan",
        "price": "149",
        "priceCurrency": "INR",
        "url": absoluteUrl("/pricing"),
      },
      {
        "@type": "Offer",
        "name": "Pro Plan",
        "price": "299",
        "priceCurrency": "INR",
        "url": absoluteUrl("/pricing"),
      }
    ]
  }
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(pricingOfferJsonLd),
        }}
      />
      <PricingClient />
    </>
  );
}
