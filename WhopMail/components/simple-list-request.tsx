'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SimpleListRequestProps {
  whopUserId: string
}

export default function SimpleListRequest({ whopUserId }: SimpleListRequestProps) {
  const [listName, setListName] = useState('')
  const [loading, setLoading] = useState(false)

  const requestList = async () => {
    if (!listName.trim()) {
      toast.error('Please enter a list name')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/email-lists/simple-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listName: listName.trim(),
          whopUserId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('List request submitted successfully! Admin will process your request shortly.')
        setListName('')
      } else {
        toast.error(data.error || 'Failed to submit list request')
      }
    } catch (error) {
      console.error('Error requesting list:', error)
      toast.error('Failed to submit list request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request New List</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="listName">List Name</Label>
          <Input
            id="listName"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Enter your list name"
            disabled={loading}
          />
        </div>
        <Button 
          onClick={requestList} 
          disabled={loading || !listName.trim()}
          className="w-full"
        >
          {loading ? 'Submitting...' : 'Request List'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Your request will be processed by our team. You'll receive a notification when your list is ready.
        </p>
      </CardContent>
    </Card>
  )
}
