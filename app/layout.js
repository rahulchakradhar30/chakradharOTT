import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Script from "next/script";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  jsonLdScript,
  buildBaseMetadata,
} from "@/lib/seo";

export const metadata = buildBaseMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  image: DEFAULT_OG_IMAGE,
});

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/favicon.ico"),
  sameAs: [],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell min-h-screen flex flex-col text-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd) }} />

        {/* Razorpay Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />

        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <Navbar />
              <main className="flex-grow pt-20 md:pt-24">
                {children}
              </main>
              <Footer />

              {/* Cookie Banner */}
              <CookieBanner />
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>

      </body>
    </html>
  );
}