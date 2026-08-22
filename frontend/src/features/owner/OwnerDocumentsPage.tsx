import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, Clock, FileCheck, ImagePlus, Loader2, Lock, XCircle } from 'lucide-react'
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

const MAX_FILE_SIZE = 5 * 1024 * 1024

const statusCopy = {
  verified: {
    title: 'KYC Approved',
    description: 'Your owner information has been verified.',
    icon: CheckCircle,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  rejected: {
    title: 'KYC Rejected',
    description: 'Your NRC photos were not accepted. Please re-upload clear photos of both sides.',
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
    description: 'Submit your NRC number and both NRC images.',
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
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<Record<string, File | null>>({ nrc_front: null, nrc_back: null })
  const [previews, setPreviews] = useState<Record<string, string>>({ nrc_front: '', nrc_back: '' })
  const fileInputRefs = {
    nrc_front: useRef<HTMLInputElement>(null),
    nrc_back: useRef<HTMLInputElement>(null),
  }

  const fetchKycData = () =>
    Promise.all([usersApi.getOwnerProfile(), usersApi.getOwnerDocuments()])

  const applyKycData = useCallback((profileData: OwnerProfile, documentData: OwnerDocument[]) => {
    setProfile(profileData)
    setDocuments(documentData)
    if (profileData.user) {
      updateUser({
        ...profileData.user,
        verification_status: normalizeVerificationStatus(profileData.admin_approval_status) as User['verification_status'],
      })
    }
  }, [updateUser])

  useEffect(() => {
    let cancelled = false

    fetchKycData()
      .then(([profileData, documentData]) => {
        if (cancelled) return
        applyKycData(profileData, documentData)
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
  }, [addToast, applyKycData])

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getDoc = (type: string) => documents.find((document) => document.type === type)

  const handleFileChange = (type: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('Please upload image files only', 'error')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      addToast(`${file.name} exceeds 5MB size limit`, 'error')
      return
    }

    setPreviews((prev) => {
      if (prev[type]) URL.revokeObjectURL(prev[type])
      return { ...prev, [type]: URL.createObjectURL(file) }
    })
    setFiles((prev) => ({ ...prev, [type]: file }))
  }

  const clearFile = (type: string) => {
    setPreviews((prev) => {
      if (prev[type]) URL.revokeObjectURL(prev[type])
      return { ...prev, [type]: '' }
    })
    setFiles((prev) => ({ ...prev, [type]: null }))
  }

  const handleSubmit = async () => {
    const uploads = OWNER_KYC_DOCUMENT_TYPES.filter((doc) => files[doc.key])
    if (uploads.length === 0) {
      addToast('Please select at least one NRC photo to upload', 'error')
      return
    }

    try {
      setUploading(true)
      for (const doc of uploads) {
        await usersApi.uploadOwnerDocument(doc.key, files[doc.key]!)
      }
      addToast('NRC photos submitted for verification', 'success')
      uploads.forEach((doc) => clearFile(doc.key))
      const [profileData, documentData] = await fetchKycData()
      applyKycData(profileData, documentData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      addToast(apiError || message, 'error')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <LoadingSkeleton type="card" count={3} />

  const verificationStatus = profile
    ? normalizeVerificationStatus(profile.admin_approval_status)
    : normalizeVerificationStatus(user?.verification_status)
  const banner = statusCopy[verificationStatus as keyof typeof statusCopy] || statusCopy.unverified
  const BannerIcon = banner.icon
  const isApproved = profile?.admin_approval_status === 'APPROVED'
  const canEdit = !isApproved

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
              {isApproved
                ? 'Your NRC number was reviewed by admin and cannot be modified.'
                : 'This is the NRC number you provided during registration.'}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">NRC Photos</h3>
                <p className="text-xs text-slate-500">
                  {canEdit
                    ? 'Upload both sides of your NRC for admin verification.'
                    : 'Verified by admin. NRC photos can no longer be changed.'}
                </p>
              </div>
              {isApproved && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {OWNER_KYC_DOCUMENT_TYPES.map((doc) => {
                const existing = getDoc(doc.key)
                const newPreview = previews[doc.key]
                const inputRef = fileInputRefs[doc.key as keyof typeof fileInputRefs]

                if (!canEdit) {
                  return (
                    <div key={doc.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-medium text-slate-900">{doc.label}</h4>
                        <StatusBadge status={existing?.status || 'not_uploaded'} type="document" />
                      </div>
                      {existing?.file_url ? (
                        <img src={existing.file_url} alt={doc.label} className="h-52 w-full rounded-lg object-cover" />
                      ) : (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                          Not uploaded
                        </p>
                      )}
                    </div>
                  )
                }

                return (
                  <div key={doc.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-medium text-slate-900">{doc.label}</h4>
                      {newPreview ? (
                        <StatusBadge status="pending" type="document" />
                      ) : (
                        <StatusBadge status={existing?.status || 'not_uploaded'} type="document" />
                      )}
                    </div>

                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const selected = e.target.files?.[0]
                        e.target.value = ''
                        if (selected) handleFileChange(doc.key, selected)
                      }}
                    />

                    {newPreview ? (
                      <div className="group relative overflow-hidden rounded-lg border border-slate-200">
                        <img src={newPreview} alt={`${doc.label} preview`} className="h-52 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => clearFile(doc.key)}
                          disabled={uploading}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                          aria-label={`Remove ${doc.label}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ) : existing?.file_url ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => inputRef?.current?.click()}
                        onKeyDown={(e) => e.key === 'Enter' && inputRef?.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const dropped = e.dataTransfer.files?.[0]
                          if (dropped) handleFileChange(doc.key, dropped)
                        }}
                        className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200"
                      >
                        <img src={existing.file_url} alt={doc.label} className="h-52 w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <ImagePlus className="h-4 w-4" />
                          Replace photo
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputRef?.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const dropped = e.dataTransfer.files?.[0]
                          if (dropped) handleFileChange(doc.key, dropped)
                        }}
                        disabled={uploading}
                        className="flex h-52 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-white p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ImagePlus className="h-6 w-6 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">Upload photo</p>
                        <p className="text-xs text-slate-400">Drag & drop or click to browse</p>
                        <p className="text-[10px] text-slate-400">Max size: 5MB (JPG, PNG)</p>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {canEdit && (
              <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
                <Button onClick={handleSubmit} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Submit for Verification
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
