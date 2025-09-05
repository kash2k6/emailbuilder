import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WhopApiResponse } from "@/app/types"

interface MembersDashboardProps {
  data: WhopApiResponse
  manualMembersCount?: number
}

export function MembersDashboard({ data, manualMembersCount = 0 }: MembersDashboardProps) {
  // Calculate combined total
  const whopMembers = data.totalMembers || 0
  const combinedTotal = whopMembers + manualMembersCount
  
  // Calculate percentages for the progress bars (use combined total for percentages)
  const activePercentage = combinedTotal ? Math.round(((data.activeMembers || 0) / combinedTotal) * 100) : 0
  const expiringPercentage = combinedTotal ? Math.round(((data.expiringMembers || 0) / combinedTotal) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="text-2xl font-bold">{combinedTotal}</div>
          <p className="text-xs text-muted-foreground">
            {manualMembersCount > 0 
              ? `Combined total (${whopMembers} Whop + ${manualMembersCount} Manual)`
              : 'Total members in your Whop account'
            }
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
            <p className="text-xs text-muted-foreground">{activePercentage}% of total members</p>
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
          <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
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
            <p className="text-xs text-muted-foreground">{expiringPercentage}% of total members</p>
            <div className="w-full bg-gray-900 rounded-full h-1">
              <div 
                className="h-1 rounded-full transition-all duration-300 bg-yellow-400"
                style={{ width: `${expiringPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
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
          <div className="text-2xl font-bold">
            {data.activeMembers && combinedTotal ? Math.round((data.activeMembers / combinedTotal) * 100) : 0}%
          </div>
          <p className="text-xs text-muted-foreground">Active members as percentage of total</p>
        </CardContent>
      </Card>
    </div>
  )
}
