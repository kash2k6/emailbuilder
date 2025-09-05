'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Mail, 
  Globe, 
  User, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Database,
  Zap,
  Info
} from 'lucide-react'
import { DomainHealthRecord } from '@/app/actions/domain-health'

interface DomainHealthProps {
  userId: string
}

export function DomainHealth({ userId }: DomainHealthProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentHealth, setCurrentHealth] = useState<DomainHealthRecord | null>(null)
  const [healthHistory, setHealthHistory] = useState<DomainHealthRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [domainInfo, setDomainInfo] = useState<{ domain: string; fromEmail: string } | null>(null)
  const [domainError, setDomainError] = useState<string | null>(null)
  const { toast } = useToast()

  // Load domain health on component mount
  useEffect(() => {
    loadDomainHealth()
    loadDomainHealthHistory()
  }, [userId])

  const loadDomainHealth = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/domain-health/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (data.success) {
        setCurrentHealth(data.data)
        setDomainInfo({
          domain: data.domain,
          fromEmail: data.fromEmail
        })
        setDomainError(null)
        
        toast({
          title: 'Domain Health Checked',
          description: data.isFresh 
            ? 'Fresh data fetched from our 3rd party partner' 
            : 'Cached data retrieved (checked within 7 days)',
          variant: 'default'
        })
      } else {
        setDomainError(data.error)
        toast({
          title: 'Check Failed',
          description: data.error || 'Failed to check domain health',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error checking domain health:', error)
      setDomainError('Failed to check domain health')
      toast({
        title: 'Error',
        description: 'Failed to check domain health',
        variant: 'destructive'
      })
    } finally {
      setIsChecking(false)
    }
  }

  const loadDomainHealthHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/domain-health/history?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setHealthHistory(data.data || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load domain health history',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading domain health history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load domain health history',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleRefreshDomain = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/domain-health/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (data.success) {
        setCurrentHealth(data.data)
        setDomainInfo({
          domain: data.domain,
          fromEmail: data.fromEmail
        })
        setDomainError(null)
        toast({
          title: 'Domain Health Refreshed',
          description: 'Fresh data fetched from Abstract API',
          variant: 'default'
        })
        // Reload history to include the new check
        loadDomainHealthHistory()
      } else {
        toast({
          title: 'Refresh Failed',
          description: data.error || 'Failed to refresh domain health',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error refreshing domain health:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh domain health',
        variant: 'destructive'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'deliverable':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'undeliverable':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'unknown':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'deliverable':
        return 'bg-green-100 text-green-800'
      case 'undeliverable':
        return 'bg-red-100 text-red-800'
      case 'unknown':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getQualityScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Domain Health Check Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Domain Health Check
          </CardTitle>
          <CardDescription>
            Check your verified domain's email reputation and deliverability using our 3rd party partner.
            Data is cached for 7 days to minimize API calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {domainError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-800">Domain Setup Required</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{domainError}</p>
              <p className="text-xs text-red-600 mt-2">
                Please set up and verify your custom domain in the EmailSync configuration first.
              </p>
            </div>
          ) : domainInfo ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-800">Verified Domain Found</span>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-green-700">
                  <span className="font-medium">Domain:</span> {domainInfo.domain}
                </p>
                <p className="text-sm text-green-700">
                  <span className="font-medium">From Email:</span> {domainInfo.fromEmail}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button 
              onClick={loadDomainHealth} 
              disabled={isChecking || !!domainError}
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking Domain Health...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Check Domain Health
                </>
              )}
            </Button>
            
            {currentHealth && (
              <Button
                variant="outline"
                onClick={handleRefreshDomain}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Force Refresh
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Domain Health Results */}
      {currentHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Domain Health Results
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {domainInfo?.domain}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Last checked: {formatDate(currentHealth.last_checked_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deliverability Status */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Deliverability
              </h3>
              <div className="flex items-center gap-3">
                {getStatusIcon(currentHealth.deliverability_status || '')}
                <Badge className={getStatusColor(currentHealth.deliverability_status || '')}>
                  {currentHealth.deliverability_status || 'Unknown'}
                </Badge>
                <span className="text-sm text-gray-600">
                  {currentHealth.deliverability_status_detail}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  {currentHealth.is_format_valid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Format Valid</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentHealth.is_smtp_valid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">SMTP Valid</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentHealth.is_mx_valid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">MX Records Valid</span>
                </div>
              </div>
            </div>

            {/* Email Quality */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Email Quality
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quality Score</span>
                  <span className={`text-lg font-bold ${getQualityScoreColor(currentHealth.quality_score || 0)}`}>
                    {currentHealth.quality_score ? Math.round(currentHealth.quality_score * 100) : 0}%
                  </span>
                </div>
                <Progress value={currentHealth.quality_score ? currentHealth.quality_score * 100 : 0} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {currentHealth.is_free_email ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">Free Email Provider</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentHealth.is_disposable ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">Disposable Email</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentHealth.is_dmarc_enforced ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">DMARC Enforced</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentHealth.is_spf_strict ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">SPF Strict</span>
                </div>
              </div>
            </div>

            {/* Domain Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domain Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Domain Age</span>
                  <p className="text-sm text-gray-600">
                    {currentHealth.domain_age ? `${Math.round(currentHealth.domain_age / 365)} years` : 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Live Website</span>
                  <p className="text-sm text-gray-600">
                    {currentHealth.is_live_site ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Registrar</span>
                  <p className="text-sm text-gray-600">
                    {currentHealth.registrar || 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Risky TLD</span>
                  <p className="text-sm text-gray-600">
                    {currentHealth.is_risky_tld ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Risk Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Address Risk</span>
                  <Badge className={getRiskColor(currentHealth.address_risk_status || '')}>
                    {currentHealth.address_risk_status || 'Unknown'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Domain Risk</span>
                  <Badge className={getRiskColor(currentHealth.domain_risk_status || '')}>
                    {currentHealth.domain_risk_status || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Data Breaches */}
            {currentHealth.total_breaches && currentHealth.total_breaches > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Data Breaches
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    This email has been found in {currentHealth.total_breaches} data breach{currentHealth.total_breaches > 1 ? 'es' : ''}.
                  </p>
                  {currentHealth.date_last_breached && (
                    <p className="text-sm text-red-700 mt-1">
                      Last breach: {formatDate(currentHealth.date_last_breached)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Next Check Info */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-orange-800">Next Check</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Data will be refreshed on: {formatDate(currentHealth.next_check_at)}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Data is cached for 7 days to minimize API calls
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Health History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Domain Health History
          </CardTitle>
          <CardDescription>
            Previously checked domains and their health status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading history...</span>
            </div>
          ) : healthHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No domain health checks found</p>
              <p className="text-sm">Check your domain above to see results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {healthHistory.map((record) => (
                <div key={record.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.deliverability_status || '')}
                      <span className="font-medium">{record.domain}</span>
                      <span className="text-sm text-gray-500">({record.email_address})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(record.deliverability_status || '')}>
                        {record.deliverability_status || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Quality Score: {record.quality_score ? Math.round(record.quality_score * 100) : 0}%</span>
                    <span>Last checked: {formatDate(record.last_checked_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 