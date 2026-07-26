import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import NotificationListener from "@/components/NotificationListener";
import MainContentContainer from "@/components/MainContentContainer";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Script from "next/script";
import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  DEFAULT_OG_IMAGE,
  buildBaseMetadata,
} from "@/lib/seo";

export const metadata = buildBaseMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  image: DEFAULT_OG_IMAGE,
  verification: {
    google: "Csxb9nxcEL6g8tDMkQro8B9G0qlNfMIncWdLgN-T7p0",
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell min-h-screen flex flex-col text-white">
        {/* Razorpay Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />

        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <Navbar />
              <NotificationListener />
              <MainContentContainer>
                {children}
              </MainContentContainer>
              <Footer />
              <CookieBanner />
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}