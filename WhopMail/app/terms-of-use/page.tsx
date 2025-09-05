import Link from "next/link"
import { SiteHeader } from "@/components/site-header"

export default function TermsOfUsePage() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">Terms of Use</h1>

          <div className="prose prose-sm max-w-none">
            <p className="mb-4 text-center">Last updated: {new Date().toLocaleDateString()}</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Whop Email Bridge service, you agree to be bound by these Terms of Use. If you
              do not agree to all the terms and conditions, you may not access or use our services.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
            <p>
              Whop Email Bridge provides integration services between Whop and various email marketing platforms. Our
              service acts as a bridge, facilitating the transfer of information between these platforms.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. Data Processing</h2>
            <p>
              <strong>We do not store or sync your customers' details.</strong> All data processing is handled
              server-side, and we have no access to your customer information. Our service processes data only as
              necessary to provide the integration functionality.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. User Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>Ensuring you have the right to use customer data with email marketing platforms</li>
              <li>Complying with all applicable laws and regulations regarding customer data</li>
              <li>Obtaining necessary consents from your customers for email marketing</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or
              indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will provide notice of significant changes by
              updating the date at the top of these terms and by maintaining a current version of the terms on our
              website.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. Contact Us</h2>
            <p>If you have any questions about these Terms of Use, please contact us at: [Your Contact Email]</p>

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
