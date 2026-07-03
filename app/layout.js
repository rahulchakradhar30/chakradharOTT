import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Script from "next/script";

export const metadata = {
  title: "Chakradhar OTT Platform - Premium Movies & Live Premieres",
  description: "Stream premium movies and exclusive live premieres. Premium cinematic experience crafted for modern audiences.",
};

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