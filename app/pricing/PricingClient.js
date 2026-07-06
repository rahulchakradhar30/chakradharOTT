"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { MovieIcon, TrophyIcon } from "@/components/Icon";

function TierIcon({ type, className = "w-10 h-10 mx-auto" }) {
  if (type === "free") {
    return <MovieIcon className={`${className} text-cyan-400`} />;
  }
  return <TrophyIcon className={`${className} text-yellow-400`} />;
}

const TIERS = [
  {
    name: "Free",
    price: 0,
    icon: "free",
    description: "Essential streaming experience",
    features: [
      "Unlimited browsing",
      "SD (480p) quality",
      "1 device simultaneously",
      "Community access",
      "Limited content library",
    ],
    notIncluded: [
      "HD quality",
      "Offline viewing",
      "Ad-free experience",
      "Premium features",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: 149,
    icon: "premium",
    description: "Best for quality lovers",
    features: [
      "Full content library",
      "HD (1080p) quality",
      "2 devices simultaneously",
      "Priority support",
      "Ad-free experience",
      "Offline viewing (7 days)",
      "Early access to premieres",
    ],
    notIncluded: ["4K quality"],
    popular: true,
    billingPeriod: "per month",
  },
  {
    name: "Pro",
    price: 299,
    icon: "⭐",
    description: "Ultimate experience",
    features: [
      "Everything in Premium",
      "4K (UltraHD) quality",
      "4 devices simultaneously",
      "VIP support (24/7)",
      "Ad-free experience",
      "Offline viewing (30 days)",
      "Exclusive content",
      "Priority transcoding",
      "Personal recommendations",
    ],
    notIncluded: [],
    popular: false,
    billingPeriod: "per month",
  },
];

export default function PricingClient() {
  const [billingCycle, setBillingCycle] = useState("monthly");

  const getPrice = (tier) => {
    if (tier.price === 0) return "Free";
    return `₹${tier.price}`;
  };

  return (
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center mb-16">
          <p className="admin-kicker mb-2">Subscription Plans</p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            Choose Your Plan
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Unlock unlimited entertainment with flexible subscription plans designed for every viewer
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {TIERS.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`relative rounded-3xl overflow-hidden transition duration-500 ${
                tier.popular
                  ? "md:scale-105 border-2 border-cyan-400 shadow-2xl shadow-cyan-500/30"
                  : "border border-white/15 hover:border-white/30"
              } glass-card`}
            >
              {tier.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2 text-center text-sm font-bold">
                  Most Popular
                </div>
              )}

              <div className={`p-8 ${tier.popular ? "pt-16" : ""}`}>
                {/* Tier Info */}
                <div className="text-center mb-8">
                  <div className="mb-3">
                    <TierIcon type={tier.icon} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{tier.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black">{getPrice(tier)}</span>
                    {tier.price > 0 && (
                      <span className="text-gray-400">{tier.billingPeriod}</span>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition mb-8 ${
                    tier.popular
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
                      : tier.price === 0
                      ? "bg-white/10 hover:bg-white/15 text-white border border-white/20"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                  }`}
                >
                  {tier.price === 0 ? "Get Started" : "Subscribe Now"}
                </button>

                {/* Features List */}
                <div className="space-y-4 mb-8">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    What&apos;s Included
                  </p>
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-cyan-400 text-lg leading-tight">✓</span>
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Not Included */}
                {tier.notIncluded.length > 0 && (
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Not Included
                    </p>
                    <ul className="space-y-2">
                      {tier.notIncluded.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-gray-600 text-lg leading-tight">✗</span>
                          <span className="text-xs text-gray-500">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I switch plans anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.",
              },
              {
                q: "Is there a free trial?",
                a: "Free tier members have full access to our streaming service with SD quality. Premium trial available with first payment.",
              },
              {
                q: "What&apos;s the difference between HD and 4K?",
                a: "4K offers 4x the pixels of 1080p for ultra-sharp picture quality on compatible devices. 4K is available only on Pro plan.",
              },
              {
                q: "Can I share my account?",
                a: "Your subscription allows simultaneous streaming on the specified number of devices (1 for Free, 2 for Premium, 4 for Pro).",
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="glass-card rounded-2xl p-6 border border-white/10 hover:border-white/20 transition"
              >
                <details className="cursor-pointer">
                  <summary className="font-semibold text-lg flex items-center justify-between">
                    <span>{faq.q}</span>
                    <span className="text-xl">→</span>
                  </summary>
                  <p className="text-gray-400 mt-4 leading-relaxed">{faq.a}</p>
                </details>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mt-16 pt-12 border-t border-white/10"
        >
          <p className="text-gray-400 mb-6">Have questions? Our support team is ready to help.</p>
          <Link
            href="/contact"
            className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition"
          >
            Get in Touch
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
