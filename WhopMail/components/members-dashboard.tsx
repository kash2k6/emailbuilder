import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WhopApiResponse } from "@/app/types"

interface MembersDashboardProps {
  data: WhopApiResponse
}

export function MembersDashboard({ data }: MembersDashboardProps) {
  // Calculate percentages for the progress bars
  const activePercentage = data.totalMembers ? Math.round(((data.activeMembers || 0) / data.totalMembers) * 100) : 0
  const trialingPercentage = data.totalMembers ? Math.round(((data.expiringMembers || 0) / data.totalMembers) * 100) : 0
  const completedPercentage = data.totalMembers ? Math.round(((data.completedMembers || 0) / data.totalMembers) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalMembers || 0}</div>
          <p className="text-xs text-muted-foreground">
            Total members in your Whop account
            {data.totalPages > 1 && <span className="text-green-600"> (accurate count)</span>}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Members</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeMembers || 0}</div>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {activePercentage}% of total members
              {data.totalPages > 1 && <span className="text-yellow-600"> (estimate from current page)</span>}
            </p>
            <div className="w-full bg-gray-900 rounded-full h-1">
              <div 
                className="h-1 rounded-full transition-all duration-300 bg-orange-400"
                style={{ width: `${activePercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trialing</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.expiringMembers || 0}</div>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {trialingPercentage}% of total members
              {data.totalPages > 1 && <span className="text-yellow-600"> (estimate from current page)</span>}
            </p>
            <div className="w-full bg-gray-900 rounded-full h-1">
              <div 
                className="h-1 rounded-full transition-all duration-300 bg-yellow-400"
                style={{ width: `${trialingPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed/Expired</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.completedMembers || 0}</div>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {completedPercentage}% of total members
              {data.totalPages > 1 && <span className="text-yellow-600"> (estimate from current page)</span>}
            </p>
            <div className="w-full bg-gray-900 rounded-full h-1">
              <div 
                className="h-1 rounded-full transition-all duration-300 bg-red-400"
                style={{ width: `${completedPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
