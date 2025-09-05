import { FormBuilder } from '@/components/form-builder'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DemoFormPage() {
  // This is a demo page - in production, you'd get the whop_user_id from the session
  const demoWhopUserId = 'demo-user-123'

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Embeddable Forms Demo</h1>
        <p className="text-muted-foreground">
          Create beautiful signup forms that you can embed anywhere
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Builder</CardTitle>
          <CardDescription>
            Create and manage your embeddable forms. Each form can be embedded on any website using an iframe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilder whopUserId={demoWhopUserId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Learn how to use embeddable forms in your marketing strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Create Your Form</h3>
              <p className="text-sm text-muted-foreground">
                Design a beautiful form with your logo, colors, and custom fields
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Get Embed Code</h3>
              <p className="text-sm text-muted-foreground">
                Copy the iframe code and paste it into your website
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Collect Subscribers</h3>
              <p className="text-sm text-muted-foreground">
                Automatically add subscribers to your email list and trigger flows
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            Everything you need to create effective lead capture forms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">🎨 Customizable Design</h4>
              <p className="text-sm text-muted-foreground">
                Match your brand with custom colors, fonts, and styling
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">📧 Email List Integration</h4>
              <p className="text-sm text-muted-foreground">
                Automatically add subscribers to your existing email lists
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">🔄 Email Flow Triggers</h4>
              <p className="text-sm text-muted-foreground">
                Trigger automated email sequences when someone subscribes
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">📊 Analytics & Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Track form submissions and conversion rates
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">🔗 Easy Embedding</h4>
              <p className="text-sm text-muted-foreground">
                Simple iframe code that works on any website
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">📱 Mobile Responsive</h4>
              <p className="text-sm text-muted-foreground">
                Forms look great on all devices and screen sizes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
