"use client"

import React, { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileText, Users, AlertCircle, CheckCircle, Loader2, Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from 'xlsx'

interface ManualListUploadProps {
  whopUserId?: string
  onUploadComplete?: () => void
  subscriptionStatus?: {
    hasActiveSubscription: boolean
    subscription?: {
      planName: string
      contactLimit: number
      planPrice: string
    }
  }
  currentMemberCount?: number
}

       interface UploadedMember {
         id: string
         email: string
         firstName?: string
         lastName?: string
         status: 'manual' // Tag to identify non-Whop members
         source: string
         uploaded_at: string
         metadata?: Record<string, any>
       }

       interface FieldMapping {
         email: string
         firstName?: string
         lastName?: string
         [key: string]: string | undefined
       }

export function ManualListUpload({ whopUserId, onUploadComplete, subscriptionStatus, currentMemberCount = 0 }: ManualListUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedMembers, setUploadedMembers] = useState<UploadedMember[]>([])
    const [previewData, setPreviewData] = useState<any[]>([])
  const [fullData, setFullData] = useState<any[]>([])
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    email: '',
    firstName: '',
    lastName: ''
  })
  const [showMappingDialog, setShowMappingDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a CSV or Excel file')
      return
    }

    try {
      const data = await parseFile(file)
      if (data.length === 0) {
        toast.error('No data found in the file')
        return
      }

      setAvailableColumns(Object.keys(data[0]))
      setFullData(data) // Store all data
      setPreviewData(data.slice(0, 5)) // Show first 5 rows for preview
      setShowMappingDialog(true)
    } catch (error) {
      console.error('Error parsing file:', error)
      toast.error('Error reading file. Please check the format.')
    }
  }, [])

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          if (!data) {
            reject(new Error('No data read from file'))
            return
          }

          let parsedData: any[] = []

          if (file.type === 'text/csv') {
            // Parse CSV
            const csv = data as string
            const lines = csv.split('\n')
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
            
            parsedData = lines.slice(1).filter(line => line.trim()).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
              const row: any = {}
              headers.forEach((header, index) => {
                row[header] = values[index] || ''
              })
              return row
            })
          } else {
            // Parse Excel
            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            parsedData = XLSX.utils.sheet_to_json(worksheet)
          }

          resolve(parsedData)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      
      if (file.type === 'text/csv') {
        reader.readAsText(file)
      } else {
        reader.readAsBinaryString(file)
      }
    })
  }

  const handleMappingComplete = () => {
    if (!fieldMapping.email) {
      toast.error('Email field mapping is required')
      return
    }

    const mappedData = fullData.map((row, index) => ({
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
      email: row[fieldMapping.email] || '',
      firstName: fieldMapping.firstName ? row[fieldMapping.firstName] : undefined,
      lastName: fieldMapping.lastName ? row[fieldMapping.lastName] : undefined,
      status: 'manual' as const,
      source: 'manual_upload',
      uploaded_at: new Date().toISOString(),
      metadata: Object.keys(fieldMapping)
        .filter(key => !['email', 'firstName', 'lastName'].includes(key))
        .reduce((acc, key) => {
          if (fieldMapping[key]) {
            acc[key] = row[fieldMapping[key]!]
          }
          return acc
        }, {} as Record<string, any>)
    }))

    // Filter out invalid emails instead of blocking upload
    const validMembers = mappedData.filter(member => {
      const email = member.email?.trim().toLowerCase()
      return email && email.includes('@') && email.includes('.') && email.length >= 5
    })

    const invalidCount = mappedData.length - validMembers.length
    if (invalidCount > 0) {
      toast.warning(`Skipped ${invalidCount} invalid emails. Proceeding with ${validMembers.length} valid emails.`)
    }

    if (validMembers.length === 0) {
      toast.error('No valid emails found. Please check your data.')
      return
    }

    setUploadedMembers(validMembers)
    setShowMappingDialog(false)
    setShowPreviewDialog(true)
  }

  const handleUploadToSystem = async () => {
    if (!whopUserId) {
      toast.error('User ID is required')
      return
    }

    if (uploadedMembers.length === 0) {
      toast.error('No members to upload')
      return
    }

    setIsUploading(true)

    try {
      // For large uploads, just save to Supabase quickly and provide download
      if (uploadedMembers.length > 1000) {
        // Quick upload to Supabase for counting only
        const response = await fetch('/api/manual-members/quick-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            whopUserId,
            memberCount: uploadedMembers.length,
            listName: listName || 'Manual Upload',
            listDescription: listDescription || 'Members uploaded manually'
          }),
        })

        const data = await response.json()

        if (data.success) {
          // Download the processed CSV for Resend upload
          downloadProcessedCSV()
          toast.success(`✅ Uploaded ${uploadedMembers.length} members to database. Download the CSV file to upload to Resend.`)
        } else {
          toast.error(data.error || 'Failed to upload members')
          return
        }
      } else {
        // Use regular upload for smaller files
        const response = await fetch('/api/manual-members/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            whopUserId,
            members: uploadedMembers,
            listName: listName || 'Manual Upload',
            listDescription: listDescription || 'Members uploaded manually'
          }),
        })

        const data = await response.json()

        if (data.success) {
          const syncStatus = data.data?.resendSynced 
            ? ` and synced ${data.data.resendSyncedCount} to Resend` 
            : ' (Resend sync failed - sync manually)'
          toast.success(`Successfully uploaded ${data.data?.processedCount || uploadedMembers.length} members${syncStatus}`)
        } else {
          toast.error(data.error || 'Failed to upload members')
          return
        }
      }
      
      setUploadedMembers([])
      setPreviewData([])
      setFullData([])
      setShowPreviewDialog(false)
      setListName('')
      setListDescription('')
      onUploadComplete?.()
    } catch (error) {
      console.error('Error uploading members:', error)
      toast.error('Failed to upload members')
    } finally {
      setIsUploading(false)
    }
  }

  const downloadProcessedCSV = () => {
    // Create CSV from the original fullData (before any processing)
    const csvData = fullData.map(row => ({
      email: row[fieldMapping.email] || '',
      firstName: fieldMapping.firstName ? row[fieldMapping.firstName] : '',
      lastName: fieldMapping.lastName ? row[fieldMapping.lastName] : ''
    }))

    // Remove empty rows and duplicates
    const cleanData = csvData.filter(row => row.email && row.email.trim() !== '')
    const uniqueData = cleanData.filter((row, index, self) => 
      index === self.findIndex(r => r.email.toLowerCase() === row.email.toLowerCase())
    )

    // Create CSV
    const ws = XLSX.utils.json_to_sheet(uniqueData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Members')
    
    // Download with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `manual_upload_${timestamp}_${uniqueData.length}_members.csv`
    XLSX.writeFile(wb, filename)
  }

  const downloadTemplate = () => {
    const template = [
      { email: 'example@email.com', firstName: 'John', lastName: 'Doe' },
      { email: 'another@email.com', firstName: 'Jane', lastName: 'Smith' }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'manual_upload_template.xlsx')
  }

  const deleteAllManualMembers = async () => {
    if (!whopUserId) {
      toast.error('User ID is required')
      return
    }

    if (!confirm('Are you sure you want to delete ALL manual members? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/manual-members/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whopUserId,
          deleteAll: true
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`✅ Deleted ${data.data.deletedCount} manual members`)
        onUploadComplete?.() // Refresh the members list
      } else {
        toast.error(data.error || 'Failed to delete manual members')
      }
    } catch (error) {
      console.error('Error deleting manual members:', error)
      toast.error('Failed to delete manual members')
    }
  }

  return (
    <Card>
      <CardHeader>
                       <CardTitle className="flex items-center gap-2">
                 <Upload className="h-5 w-5" />
                 Manual Member Upload
               </CardTitle>
               <CardDescription>
                 Upload CSV or Excel files with member data. These members will be tagged as "Manual" and tracked separately from your Whop members. Perfect for tracking leads who haven't joined Whop yet.
               </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Upload File</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button variant="destructive" onClick={deleteAllManualMembers}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Supported formats: CSV, Excel (.xlsx, .xls). Email field is required.
          </p>
        </div>

        {uploadedMembers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Uploaded Members ({uploadedMembers.length})</Label>
              <Badge variant="secondary">Manual</Badge>
            </div>
            <div className="border rounded-lg max-h-40 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedMembers.slice(0, 5).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.firstName || '-'}</TableCell>
                      <TableCell>{member.lastName || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {uploadedMembers.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        ... and {uploadedMembers.length - 5} more
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Field Mapping Dialog */}
        <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Map Fields</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Email Field *</Label>
                  <Select value={fieldMapping.email} onValueChange={(value) => setFieldMapping(prev => ({ ...prev, email: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                                       <div>
                         <Label>First Name Field</Label>
                         <Select value={fieldMapping.firstName} onValueChange={(value) => setFieldMapping(prev => ({ ...prev, firstName: value === 'none' ? '' : value }))}>
                           <SelectTrigger>
                             <SelectValue placeholder="Select first name column" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="none">None</SelectItem>
                             {availableColumns.map((column) => (
                               <SelectItem key={column} value={column}>
                                 {column}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                                       <div>
                         <Label>Last Name Field</Label>
                         <Select value={fieldMapping.lastName} onValueChange={(value) => setFieldMapping(prev => ({ ...prev, lastName: value === 'none' ? '' : value }))}>
                           <SelectTrigger>
                             <SelectValue placeholder="Select last name column" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="none">None</SelectItem>
                             {availableColumns.map((column) => (
                               <SelectItem key={column} value={column}>
                                 {column}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
              </div>

              <div className="space-y-2">
                <Label>Preview (First 5 rows)</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {availableColumns.map((column) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index}>
                          {availableColumns.map((column) => (
                            <TableCell key={column}>{row[column] || ''}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowMappingDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleMappingComplete}>
                  Continue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview and Upload Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review and Upload</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>List Name</Label>
                  <Input
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="Enter list name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={listDescription}
                    onChange={(e) => setListDescription(e.target.value)}
                    placeholder="Enter description"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mapped Members ({uploadedMembers.length})</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Last Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedMembers.slice(0, 5).map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.firstName || '-'}</TableCell>
                          <TableCell>{member.lastName || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Manual</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {uploadedMembers.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            ... and {uploadedMembers.length - 5} more
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

                                   <div className="bg-muted p-3 rounded-lg">
                       <div className="flex items-start gap-2">
                         <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                         <div className="text-sm text-muted-foreground">
                           <p className="font-medium">What happens next?</p>
                           <ul className="mt-1 space-y-1">
                             <li>• Members will be tagged as "Manual" to distinguish from Whop members</li>
                             <li>• You can add them to email lists for syncing to your email service</li>
                             <li>• Manual members are tracked separately but can be included in total counts</li>
                             <li>• Large uploads ({uploadedMembers.length > 1000 ? 'like this one' : 'over 1000 members'}) will be processed in batches for reliability</li>
                           </ul>
                         </div>
                       </div>
                     </div>

                     {/* Plan Limit Check */}
                     {subscriptionStatus?.hasActiveSubscription && (
                       <div className={`p-3 rounded-lg border ${
                         currentMemberCount + uploadedMembers.length > (subscriptionStatus.subscription?.contactLimit || 3000) 
                           ? 'border-red-200 bg-red-50' 
                           : 'border-orange-200 bg-orange-50'
                       }`}>
                         <div className="flex items-start gap-2">
                           <AlertCircle className={`h-4 w-4 mt-0.5 ${
                             currentMemberCount + uploadedMembers.length > (subscriptionStatus.subscription?.contactLimit || 3000)
                               ? 'text-red-600'
                               : 'text-orange-600'
                           }`} />
                           <div className="text-sm">
                             <p className={`font-medium ${
                               currentMemberCount + uploadedMembers.length > (subscriptionStatus.subscription?.contactLimit || 3000)
                                 ? 'text-red-800'
                                 : 'text-orange-800'
                             }`}>
                               Plan Limit Check
                             </p>
                             <div className="mt-1 space-y-1">
                               <div><strong>Current Members:</strong> {currentMemberCount.toLocaleString()}</div>
                               <div><strong>New Members:</strong> {uploadedMembers.length.toLocaleString()}</div>
                               <div><strong>Total After Upload:</strong> {(currentMemberCount + uploadedMembers.length).toLocaleString()}</div>
                               <div><strong>Plan Limit:</strong> {(subscriptionStatus.subscription?.contactLimit || 3000).toLocaleString()}</div>
                             </div>
                                                            {currentMemberCount + uploadedMembers.length > (subscriptionStatus.subscription?.contactLimit || 3000) && (
                               <div className="text-red-600 mt-2 font-medium">
                                 ⚠️ This upload would exceed your {subscriptionStatus.subscription?.planName || 'Basic'} plan limit. Please upgrade your plan first.
                               </div>
                             )}
                           </div>
                         </div>
                       </div>
                     )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUploadToSystem} 
                  disabled={
                    isUploading || 
                    (subscriptionStatus?.hasActiveSubscription && 
                     currentMemberCount + uploadedMembers.length > (subscriptionStatus.subscription?.contactLimit || 3000))
                  }
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Upload {uploadedMembers.length} Members
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
