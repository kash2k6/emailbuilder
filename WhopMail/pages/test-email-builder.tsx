"use client"

import { useState } from 'react'
import { AdvancedEmailDesigner } from '../components/advanced-email-designer'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function TestEmailBuilder() {
  const [testEmail, setTestEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const sendTestEmail = async () => {
    if (!testEmail) return

    setIsLoading(true)
    try {
      // Create a simple test email
      const testElements = [
        {
          id: '1',
          type: 'text',
          content: '**Welcome to WhopMail!**\n\nThis is a test email from our advanced Gmail-compatible email builder.',
          styles: {
            fontSize: '18px',
            color: '#1f2937',
            paddingX: '24px',
            paddingY: '20px'
          },
          properties: {}
        },
        {
          id: '2',
          type: 'button',
          content: 'Get Started',
          styles: {
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            borderRadius: '8px'
          },
          properties: {
            text: 'Get Started',
            url: 'https://whopmail.com',
            size: 'medium',
            alignment: 'center'
          }
        }
      ]

      const response = await fetch('/api/email-builder/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: testEmail,
          elements: testElements,
          emailWidth: 600
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Failed to send test email' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">WhopMail Email Builder Integration Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Email Section */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button 
              onClick={sendTestEmail} 
              disabled={!testEmail || isLoading}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send Test Email'}
            </Button>
            
            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>{result.success ? 'Success!' : 'Error:'}</strong>
                <p>{result.message || result.error}</p>
                {result.data?.emailId && <p>Email ID: {result.data.emailId}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features List */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Gmail-compatible table-based rendering
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                React.email component integration
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Resend API email delivery
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Flexible email width (320px-800px)
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Markdown text formatting support
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Cross-client email compatibility
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Email Builder */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Email Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] border rounded-lg">
              <AdvancedEmailDesigner />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}