import { useEffect, useState } from 'react'
import { CheckCircle, Clock, FileCheck, Save, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { usersApi } from '@/api'
import { useAuth, useToast } from '@/providers'
import type { OwnerDocument, OwnerProfile, User } from '@/types'
import { normalizeVerificationStatus, OWNER_KYC_DOCUMENT_TYPES } from '@/constants'

const statusCopy = {
  verified: {
    title: 'KYC Approved',
    description: 'Your owner information has been verified.',
    icon: CheckCircle,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  rejected: {
    title: 'KYC Rejected',
    description: 'Please update your address. NRC information was reviewed by admin.',
    icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  pending: {
    title: 'KYC Under Review',
    description: 'Your submitted information is waiting for admin review.',
    icon: Clock,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  },
  unverified: {
    title: 'KYC Required',
    description: 'Submit your NRC number, address, and both NRC images.',
    icon: FileCheck,
    className: 'border-gray-200 bg-gray-50 text-gray-700',
  },
}

function profileStatus(profile: OwnerProfile | null) {
  if (profile?.admin_approval_status === 'APPROVED') return 'approved'
  if (profile?.admin_approval_status === 'REJECTED') return 'rejected'
  return 'pending'
}

export function OwnerDocumentsPage() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const [profile, setProfile] = useState<OwnerProfile | null>(null)
  const [documents, setDocuments] = useState<OwnerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [address, setAddress] = useState('')

  useEffect(() => {
    let cancelled = false

    void Promise.all([usersApi.getOwnerProfile(), usersApi.getOwnerDocuments()])
      .then(([profileData, documentData]) => {
        if (cancelled) return
        setProfile(profileData)
        setDocuments(documentData)
        setAddress(profileData.address || '')
        if (profileData.user) {
          updateUser({
            ...profileData.user,
            verification_status: normalizeVerificationStatus(profileData.admin_approval_status) as User['verification_status'],
          })
        }
      })
      .catch(() => {
        if (!cancelled) addToast('Failed to load KYC information', 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [addToast, updateUser])

  const handleSave = async () => {
    try {
      setSaving(true)
      const updated = await usersApi.updateOwnerProfile({
        address: address.trim(),
      })
      setProfile(updated)
      setAddress(updated.address || '')
      addToast('KYC information saved', 'success')
    } catch (err: unknown) {
      addToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save KYC information', 'error')
    } finally {
      setSaving(false)
    }
  }

  const getDoc = (type: string) => documents.find((document) => document.type === type)

  if (loading) return <LoadingSkeleton type="card" count={3} />

  const verificationStatus = profile
    ? normalizeVerificationStatus(profile.admin_approval_status)
    : normalizeVerificationStatus(user?.verification_status)
  const banner = statusCopy[verificationStatus as keyof typeof statusCopy] || statusCopy.unverified
  const BannerIcon = banner.icon

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Owner KYC</h1>
          <p className="text-muted-foreground">Manage the information used to verify your owner account.</p>
        </div>
        <StatusBadge status={verificationStatus} type="verification" />
      </div>

      <div className={`flex items-start gap-3 rounded-lg border p-4 ${banner.className}`}>
        <BannerIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">{banner.title}</p>
          <p className="text-sm opacity-90">{banner.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">KYC Information</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Approval</span>
              <StatusBadge status={profileStatus(profile)} type="document" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="owner-nrc">NRC Number</Label>
            <Input
              id="owner-nrc"
              value={profile?.nrc_text || profile?.nrc_number || ''}
              readOnly
              className="bg-slate-50 text-slate-700"
            />
            <p className="text-xs text-slate-500">
              Your NRC number was reviewed by admin and cannot be modified from this page.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-address">Address</Label>
            <textarea
              id="owner-address"
              rows={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Street, quarter, township"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-950">NRC Photos</h3>
              <p className="text-xs text-slate-500">NRC front and back photos submitted for verification.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {OWNER_KYC_DOCUMENT_TYPES.map((doc) => {
                const existing = getDoc(doc.key)
                return (
                  <div key={doc.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-medium text-slate-900">{doc.label}</h4>
                      <StatusBadge status={existing?.status || 'not_uploaded'} type="document" />
                    </div>

                    {existing?.file_url ? (
                      <img src={existing.file_url} alt={doc.label} className="h-36 w-full rounded-lg object-cover" />
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                        Not uploaded
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
              <Button type="button" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save KYC Info'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}