import { headers } from "next/headers"
import { Suspense } from "react"
import DashboardClient from "@/components/dashboard-client"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

/**
 * DashboardPage (Server Component)
 *
 * This component runs ONLY on the server. Its sole responsibility is to
 * read the request headers (a server-only operation) and pass the relevant
 * Whop context down to the interactive client component.
 */
export default function DashboardPage() {
  const headerList = headers()

  // These headers are injected by Whop when the app is loaded inside their platform
  const whopToken = headerList.get("x-whop-token")
  const whopUserId = headerList.get("x-whop-user-id")
  const whopCompanyId = headerList.get("x-whop-company-id")

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient whopToken={whopToken} whopUserId={whopUserId} whopCompanyId={whopCompanyId} />
      </Suspense>
    </div>
  )
}
