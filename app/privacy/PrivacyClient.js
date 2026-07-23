"use client";

import { motion } from "framer-motion";

export default function PrivacyClient() {
  return (
    <div className="min-h-screen text-white px-4 md:px-10 lg:px-16 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.14),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,174,51,0.12),_transparent_28%)]" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-4xl mx-auto space-y-6"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8">
          <p className="admin-kicker mb-2">Policy</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-gray-300 text-sm mt-2">
            Chakradhar STREAM Platform
          </p>

          <p className="text-gray-400 text-xs mt-1">
            Last Updated: April 17, 2026
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-200 mt-8">

            <section>
              <h2 className="font-semibold text-white">1. Introduction</h2>
              <p>
                Chakradhar STREAM Platform (“Platform”, “we”, “our”, “us”) respects your privacy.
                This Privacy Policy explains how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-white">2. Information We Collect</h2>
              <p>We may collect the following:</p>
              <ul className="list-disc pl-6">
                <li>Email address (via authentication)</li>
                <li>Name and profile details</li>
                <li>Comments, ratings, and activity</li>
                <li>Usage data (pages visited, interactions)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-white">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6">
                <li>To provide and improve platform services</li>
                <li>To manage user accounts</li>
                <li>To personalize user experience</li>
                <li>To monitor platform performance and security</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-white">4. Cookies</h2>
              <p>
                We use cookies to enhance your experience. Cookies help us remember preferences
                and improve performance. You can disable cookies in your browser settings.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-white">5. Data Sharing</h2>
              <p>
                We do NOT sell or rent your personal data. Your data may be processed using
                trusted third-party services such as Firebase for authentication and database.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-white">6. Third-Party Services</h2>
              <p>
                This platform uses third-party services like YouTube (for video streaming)
                and Firebase (for backend services). These services may collect data as per their own policies.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-white">7. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your data.
                However, no system is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-white">8. User Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6">
                <li>Access your data</li>
                <li>Update your profile</li>
                <li>Request deletion of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-white">9. Children’s Privacy</h2>
              <p>
                This platform is not intended for children under 13 without parental supervision.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-white">10. Changes to Policy</h2>
              <p>
                We may update this Privacy Policy at any time.
                Continued use of the platform means you accept the changes.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-white">11. Contact</h2>
              <p>Email: thefifthagefilms@gmail.com</p>
              <p>Platform: Chakradhar STREAM</p>
            </section>

            <div className="mt-10 text-xs text-gray-400 border-t border-white/10 pt-6">
              <p>
                Your privacy matters to us. We are committed to protecting your data and maintaining transparency.
              </p>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}