import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { profileSchema, type ProfileFormData } from '@/utils/validation'
import { useAuth, useToast } from '@/providers'
import { usersApi } from '@/api'
import { getInitials } from '@/utils/format'
import { MYANMAR_CITIES } from '@/constants'
import { Camera } from 'lucide-react'

export function OwnerProfilePage() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  const { register, handleSubmit, control, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      city: user?.city || '',
      township: user?.township || '',
      address: user?.address || '',
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true)
      const updated = await usersApi.updateProfile({
        name: data.name,
        city: data.city || null,
        township: data.township || null,
        address: data.address || null,
      })
      updateUser(updated)
      addToast('Profile updated', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || err.response?.data?.message || 'Update failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleProfilePhoto = async (file?: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addToast('Please upload an image file', 'error')
      return
    }

    try {
      setPhotoUploading(true)
      const updated = await usersApi.uploadProfilePhoto(file)
      updateUser(updated)
      addToast('Profile photo updated', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || err.response?.data?.message || 'Photo upload failed', 'error')
    } finally {
      setPhotoUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user?.profile_photo_url || ''} />
                  <AvatarFallback className="text-lg">{user ? getInitials(user.name) : '?'}</AvatarFallback>
                </Avatar>
                <input
                  id="owner-profile-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void handleProfilePhoto(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  disabled={photoUploading}
                  onClick={() => document.getElementById('owner-profile-photo')?.click()}
                  aria-label="Upload profile photo"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <CardTitle>{user?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {photoUploading && <p className="text-xs text-muted-foreground mt-1">Uploading photo...</p>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={user?.phone || ''} disabled className="bg-slate-50" />
                <p className="text-xs text-slate-500">
                  Phone number was registered with your account and cannot be changed.
                </p>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {MYANMAR_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Township</Label>
                <Input {...register('township')} placeholder="e.g. Aungmyaythazan" />
                {errors.township && <p className="text-xs text-red-500">{errors.township.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <textarea
                  rows={3}
                  {...register('address')}
                  placeholder="Street, quarter, building"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
              </div>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}