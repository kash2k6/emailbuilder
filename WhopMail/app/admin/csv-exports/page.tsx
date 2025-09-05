'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

interface CSVExport {
  id: string
  job_id: string
  audience_name: string
  contact_count: number
  status: string
  created_at: string
  batch_jobs: {
    whop_user_id: string
    list_name: string
  }
}

export default function CSVExportsPage() {
  const [csvExports, setCsvExports] = useState<CSVExport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCSVExports()
  }, [])

  const fetchCSVExports = async () => {
    try {
      const response = await fetch('/api/csv-exports')
      const data = await response.json()
      
      if (data.csvExports) {
        setCsvExports(data.csvExports)
      }
    } catch (error) {
      console.error('Error fetching CSV exports:', error)
      toast.error('Failed to fetch CSV exports')
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = async (csvExportId: string, audienceName: string) => {
    try {
      const response = await fetch('/api/csv-exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csvExportId })
      })

      const data = await response.json()
      
      if (data.csvContent) {
        // Create and download the CSV file
        const blob = new Blob([data.csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${audienceName}_${data.contactCount}_contacts.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success(`Downloaded CSV with ${data.contactCount} contacts`)
      }
    } catch (error) {
      console.error('Error downloading CSV:', error)
      toast.error('Failed to download CSV')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default">Ready</Badge>
      case 'downloaded':
        return <Badge variant="secondary">Downloaded</Badge>
      case 'processed':
        return <Badge variant="outline">Processed</Badge>
      default:
        return <Badge variant="destructive">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading CSV exports...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            CSV Exports for Manual Resend Upload
            <Button onClick={fetchCSVExports} variant="outline" size="sm">
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {csvExports.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No CSV exports found. Batch jobs will appear here once completed.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Audience Name</TableHead>
                  <TableHead>Contact Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvExports.map((export_) => (
                  <TableRow key={export_.id}>
                    <TableCell className="font-mono text-sm">
                      {export_.job_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {export_.audience_name}
                    </TableCell>
                    <TableCell>
                      {export_.contact_count.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(export_.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(export_.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => downloadCSV(export_.id, export_.audience_name)}
                        size="sm"
                        disabled={export_.status === 'downloaded'}
                      >
                        Download CSV
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">How to manually upload to Resend:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click "Download CSV" for the audience you want to sync</li>
              <li>Go to your Resend dashboard</li>
              <li>Create a new audience with the same name as shown above</li>
              <li>Upload the downloaded CSV file to the audience</li>
              <li>The CSV contains: Email, First Name, Last Name, Username, Product, Status, Created At, Expires At</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
