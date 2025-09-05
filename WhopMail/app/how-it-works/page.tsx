import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Steps, Step } from "@/components/ui/steps"

export default function HowItWorksPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="How It Works" text="Learn how to connect Whop to your email marketing platform." />
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Setup Process</CardTitle>
            <CardDescription>Follow these steps to set up the Whop Email Bridge.</CardDescription>
          </CardHeader>
          <CardContent>
            <Steps>
              <Step title="Enter Whop API Key">
                <p className="text-muted-foreground">
                  Sign in with your Whop account and enter your Whop API key in the dashboard. This allows us to
                  securely access your Whop members data.
                </p>
              </Step>
              <Step title="Select Email Platform">
                <p className="text-muted-foreground">
                  Choose your preferred email marketing platform from our list of supported providers.
                </p>
              </Step>
              <Step title="Configure Lists">
                <p className="text-muted-foreground">
                  We'll automatically create two lists in your email platform: one for active members and one for
                  expiring members.
                </p>
              </Step>
              <Step title="Sync Members">
                <p className="text-muted-foreground">
                  Your Whop members will be synced to the appropriate lists. This happens automatically on a regular
                  schedule.
                </p>
              </Step>
            </Steps>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How the Integration Works</CardTitle>
            <CardDescription>
              Technical details about the integration between Whop and your email platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Secure Integration</h3>
              <p className="text-muted-foreground">
                Our integration platform connects Whop with your email marketing service. This provides a reliable and
                secure connection without requiring complex technical setup.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium">Data Flow</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Your Whop API key is securely stored and used to authenticate with the Whop API</li>
                <li>Our system retrieves your member data from Whop</li>
                <li>Members are categorized as active or expiring based on their subscription status</li>
                <li>The system connects to your email marketing platform using your credentials</li>
                <li>Members are added to the appropriate lists in your email platform</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-medium">Security</h3>
              <p className="text-muted-foreground">
                Your API keys and credentials are securely stored and encrypted. We use industry-standard security
                practices to protect your data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
