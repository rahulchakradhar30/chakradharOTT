"use client";

import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <div className="min-h-screen text-white px-4 md:px-10 lg:px-16 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,77,141,0.1),_transparent_26%)]" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-4xl mx-auto space-y-6"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8">
          <p className="admin-kicker mb-2">Policy</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Terms and Conditions
          </h1>

          <p className="text-gray-300 text-sm mt-2">
            Chakradhar OTT Platform
          </p>

          <p className="text-gray-400 text-xs mt-1">
            Last Updated: April 17, 2026
          </p>

          <div className="space-y-6 text-sm leading-relaxed text-gray-200 mt-8">

          <section>
            <h2 className="font-semibold text-white">1. Introduction</h2>
            <p>
              Welcome to Chakradhar OTT Platform (“Platform”, “we”, “our”, “us”).
              By accessing or using this platform, you agree to comply with and be bound by these Terms and Conditions.
            </p>
            <p>If you do not agree, you must not use this platform.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">2. Eligibility</h2>
            <p>You must be at least 13 years old to use this platform.</p>
            <p>If you are under 18, you must use this platform under parental supervision.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">3. Platform Usage</h2>
            <p>You agree to use the platform only for lawful purposes.</p>
            <ul className="list-disc pl-6">
              <li>Violate any applicable laws or regulations</li>
              <li>Attempt unauthorized access to the platform</li>
              <li>Interfere with platform functionality</li>
              <li>Use bots, scripts, or automation tools</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-white">4. Intellectual Property Rights</h2>
            <p>All content including code, UI/UX, branding, videos, and system architecture are exclusive property of Chakradhar OTT.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">5. Prohibition on Copying / Cloning</h2>
            <ul className="list-disc pl-6">
              <li>Copying source code</li>
              <li>Cloning platform structure or features</li>
              <li>Reverse engineering</li>
              <li>Reproducing UI/UX</li>
              <li>Creating derivative platforms</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-white">6. Legal Action (Indian Law)</h2>
            <p>Violations may be prosecuted under:</p>
            <ul className="list-disc pl-6">
              <li>Copyright Act, 1957</li>
              <li>IT Act, 2000 (Sections 43, 65, 66)</li>
              <li>IPC Sections 379, 420, 406</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-white">7. User-Generated Content</h2>
            <p>Users may post comments, ratings, messages.</p>
            <p>We may remove content or ban users if necessary.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">8. Content Ownership</h2>
            <p>All films remain property of their respective creators and are embedded via authorized sources.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">9. Live Premiere System</h2>
            <p>Premiere entry may require valid tickets.</p>
            <p>Unauthorized sharing is prohibited.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">10. Payments</h2>
            <p>All payments are non-refundable unless stated.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">11. Limitation of Liability</h2>
            <p>We are not responsible for internet issues, third-party failures, or device incompatibility.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">12. Platform Availability</h2>
            <p>We may modify or suspend services without notice.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">13. Termination</h2>
            <p>We may suspend or terminate access for misuse.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">14. Privacy</h2>
            <p>User data is handled as per our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">15. Governing Law</h2>
            <p>Governed by the laws of India.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">16. Changes to Terms</h2>
            <p>We may update these terms anytime.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white">17. Contact</h2>
            <p>Email: thefifthagefilms@gmail.com</p>
            <p>Platform: Chakradhar OTT</p>
          </section>

          <div className="mt-10 text-red-300 text-xs border-t border-white/10 pt-6">
            <p>
              This platform is a protected digital product. Unauthorized replication is a punishable offense.
            </p>
          </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}