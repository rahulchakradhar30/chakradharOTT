import {
  buildBaseMetadata,
  absoluteUrl,
  jsonLdScript,
  buildBreadcrumbJsonLd,
  buildFAQJsonLd,
  SITE_NAME,
} from "@/lib/seo";
import PricingClient from "./PricingClient";

export const metadata = buildBaseMetadata({
  title: `Subscription Plans & Pricing | ${SITE_NAME}`,
  description: "Explore our flexible Free, Premium, and Pro subscription plans. Unlock high-definition streaming, co-watching lobbies, and AI recommendations on Chakradhar Stream.",
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
        "name": "Free Tier",
        "price": "0",
        "priceCurrency": "INR",
        "url": absoluteUrl("/pricing"),
      },
      {
        "@type": "Offer",
        "name": "Premium Tier",
        "price": "149",
        "priceCurrency": "INR",
        "url": absoluteUrl("/pricing"),
      },
      {
        "@type": "Offer",
        "name": "Pro Tier",
        "price": "299",
        "priceCurrency": "INR",
        "url": absoluteUrl("/pricing"),
      }
    ]
  }
};

const pricingFaqJsonLd = buildFAQJsonLd([
  {
    question: "Can I cancel my Chakradhar Stream subscription anytime?",
    answer: "Yes, you can cancel or downgrade your subscription at any time from your Profile settings."
  },
  {
    question: "What payment methods are supported on Chakradhar Stream?",
    answer: "We support Razorpay, UPI, Credit Cards, Debit Cards, Net Banking, and Wallet payments."
  },
  {
    question: "Does Chakradhar Stream support Watch Parties?",
    answer: "Yes, Premium and Pro subscribers can host or join synchronized Watch Parties with friends."
  }
]);

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Pricing", path: "/pricing" },
]);

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(pricingOfferJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(pricingFaqJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <PricingClient />
    </>
  );
}
