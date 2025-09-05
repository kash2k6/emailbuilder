"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Building2, 
  Calendar, 
  CreditCard, 
  Globe,
  MapPin,
  Phone,
  ExternalLink,
  Crown,
  Users,
  Tag
} from "lucide-react"
import { WhopCompany } from "@/app/actions/app-builder"

interface ContactDetailsDialogProps {
  contact: WhopCompany | null
  isOpen: boolean
  onClose: () => void
}

export function ContactDetailsDialog({ contact, isOpen, onClose }: ContactDetailsDialogProps) {
  if (!contact) return null

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about {contact.owner.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-lg font-semibold">{contact.owner.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Username</label>
                  <p className="text-lg">{contact.owner.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {contact.owner.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                  <p className="text-lg">{formatDate(contact.owner.created_at)}</p>
                </div>
              </div>
              
              {contact.owner.profile_pic_url && (
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-muted-foreground">Profile Picture</label>
                  <img 
                    src={contact.owner.profile_pic_url} 
                    alt={contact.owner.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                  <p className="text-lg font-semibold">{contact.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company ID</label>
                  <p className="text-lg font-mono text-sm">{contact.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-lg">{formatDate(contact.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <Badge variant={contact.has_payment_method ? "default" : "secondary"}>
                      {contact.has_payment_method ? "Has Payment Method" : "No Payment Method"}
                    </Badge>
                  </div>
                </div>
              </div>

              {contact.image_url && (
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-muted-foreground">Company Logo</label>
                  <img 
                    src={contact.image_url} 
                    alt={contact.title}
                    className="w-16 h-16 rounded object-cover"
                  />
                </div>
              )}

              {contact.route && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Route</label>
                  <p className="text-lg flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <a 
                      href={`https://whop.com${contact.route}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:underline flex items-center gap-1"
                    >
                      {contact.route}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Source Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Source API Key</label>
                  <p className="text-lg">{contact._source_api_key_name || "Unknown"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">API Key ID</label>
                  <p className="text-lg font-mono text-sm">{contact._source_api_key_id || "Unknown"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authorized User (if exists) */}
          {contact.authorized_user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Authorized User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-lg">{contact.authorized_user.user.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Username</label>
                    <p className="text-lg">{contact.authorized_user.user.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-lg">{contact.authorized_user.user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Role</label>
                    <Badge variant="outline">{contact.authorized_user.role}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw Data (for debugging) */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-40">
                {JSON.stringify(contact, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 