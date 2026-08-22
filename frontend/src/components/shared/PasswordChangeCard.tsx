import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePasswordSchema, type ChangePasswordFormData } from '@/utils/validation'
import { usersApi } from '@/api'
import { useAuth, useToast } from '@/providers'
import { AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react'

function PasswordInput({
  id,
  placeholder,
  error,
  register,
}: {
  id: string
  placeholder: string
  error?: string
  register: Record<string, unknown>
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{placeholder}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          className="pr-10"
          {...register}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordChangeCard() {
  const { addToast } = useToast()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setSaving(true)
      await usersApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      // The backend revoked all sessions — force a fresh sign-in on every device.
      await logout()
      addToast('Password changed. Please sign in with your new password.', 'success')
      navigate('/login', { replace: true })
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to change password'
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Change Password</CardTitle>
          <CardDescription>
            For your security, the current password must be verified before a new password is saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <PasswordInput
              id="current-password"
              placeholder="Current Password"
              error={errors.currentPassword?.message}
              register={register('currentPassword')}
            />
            <PasswordInput
              id="new-password"
              placeholder="New Password"
              error={errors.newPassword?.message}
              register={register('newPassword')}
            />
            <PasswordInput
              id="confirm-new-password"
              placeholder="Confirm New Password"
              error={errors.confirmNewPassword?.message}
              register={register('confirmNewPassword')}
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
              <p className="mb-0.5 flex items-center gap-1.5 font-semibold text-slate-700">
                <KeyRound className="h-3.5 w-3.5" />
                Password requirements
              </p>
              At least 8 characters with an uppercase letter, lowercase letter, number, and special character.
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
