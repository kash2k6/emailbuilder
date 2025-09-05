'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Edit, Loader2, AlertCircle } from 'lucide-react'
import { updateFromName } from '@/app/actions/emailsync'

interface SimpleEmailEditProps {
  whopUserId: string
}

export function SimpleEmailEdit({ whopUserId }: SimpleEmailEditProps) {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [newFromName, setNewFromName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true)
        
        // Simple query to get the config
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        const { data, error } = await supabase
          .from('email_platform_configs')
          .select('*')
          .eq('whop_user_id', whopUserId)
          .maybeSingle()
        
        if (error) {
          console.error('Error fetching config:', error)
          setError('Failed to load configuration')
          return
        }
        
        if (!data) {
          setError('No email configuration found')
          return
        }
        
        console.log('Found config:', data)
        setConfig(data)
        setNewFromName(data.from_name || '')
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }
    
    fetchConfig()
  }, [whopUserId])

  const handleUpdate = async () => {
    if (!config || !newFromName.trim()) return
    
    try {
      setUpdating(true)
      setError(null)
      
      const result = await updateFromName(whopUserId, newFromName)
      
      if (result.success) {
        setSuccess(true)
        setConfig({ ...config, from_name: newFromName })
        setEditing(false)
        
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || 'Failed to update from name')
      }
    } catch (err) {
      console.error('Error updating:', err)
      setError('Failed to update from name')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading configuration...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !config) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No email configuration found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-500" />
          Current Email Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              From name updated successfully!
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Email Type</Label>
            <p className="text-lg">{config.email_type === 'whopmail' ? 'whopmail.com' : 'Custom Domain'}</p>
          </div>
          
          {config.email_type === 'whopmail' && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Username</Label>
              <p className="text-lg">{config.username}@whopmail.com</p>
            </div>
          )}
          
          {config.email_type === 'custom' && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Domain</Label>
              <p className="text-lg">{config.custom_domain}</p>
            </div>
          )}
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">From Email</Label>
            <p className="text-lg">{config.from_email}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">From Name</Label>
            {editing ? (
              <div className="flex gap-2 mt-1">
                <Input
                  value={newFromName}
                  onChange={(e) => setNewFromName(e.target.value)}
                  placeholder="Enter new from name"
                  disabled={updating}
                />
                <Button 
                  onClick={handleUpdate} 
                  disabled={updating || !newFromName.trim()}
                  size="sm"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditing(false)
                    setNewFromName(config.from_name || '')
                    setError(null)
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg">{config.from_name}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
