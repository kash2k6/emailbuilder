import Link from "next/link"
import { SiteHeader } from "@/components/site-header"

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>

          <div className="prose prose-sm max-w-none">
            <p className="mb-4 text-center">Last updated: {new Date().toLocaleDateString()}</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
            <p>
              Welcome to Whop Email Bridge. We respect your privacy and are committed to protecting your personal data.
              This privacy policy will inform you about how we look after your personal data when you visit our website
              and tell you about your privacy rights and how the law protects you.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. Data Processing Principles</h2>
            <p>
              <strong>We do not store or sync your customers' details.</strong> All data processing is handled
              server-side, and we have no access to your customer information. Our service acts as a bridge between Whop
              and your chosen email marketing platform, without storing any customer data on our servers.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. Information We Collect</h2>
            <p>We only collect the minimum information necessary to provide our service:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Your account information (email, password) for authentication purposes</li>
              <li>API keys for connecting to your email marketing platforms</li>
              <li>Configuration settings for your integration</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. How We Use Your Information</h2>
            <p>We use your information solely to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Authenticate you to our service</li>
              <li>Facilitate the connection between Whop and your email marketing platform</li>
              <li>Provide customer support</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. Your API keys are
              encrypted, and we follow industry best practices for data security.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our data practices, please contact us at: [Your
              Contact Email]
            </p>

            <div className="mt-8 text-center">
              <Link href="/" className="text-orange-600 hover:underline">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
