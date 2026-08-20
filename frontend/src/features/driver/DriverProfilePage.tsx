import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { profileSchema, type ProfileFormData } from '@/utils/validation';
import { useAuth, useToast } from '@/providers';
import { usersApi } from '@/api';
import { getInitials } from '@/utils/format';
import { VERIFICATION_LABELS, VERIFICATION_COLORS } from '@/constants';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Lock, 
  Shield, 
  Eye, 
  EyeOff, 
  Save, 
  Calendar,
  AlertCircle,
  Camera
} from 'lucide-react';

export function DriverProfilePage() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      name: user?.name || '', 
      phone: user?.phone || '',
      password: '',
      password_confirmation: ''
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      // Clean up empty password fields so we don't send empty strings to the backend
      const payload: Partial<ProfileFormData> = {
        name: data.name,
        phone: data.phone,
      };
      if (data.password && data.password.trim() !== "") {
        payload.password = data.password;
        payload.password_confirmation = data.password_confirmation;
      }

      const updated = await usersApi.updateDriverUserProfile(payload);
      updateUser(updated);
      
      // Reset form with new values and clear password inputs
      reset({
        name: updated.name,
        phone: updated.phone,
        password: '',
        password_confirmation: ''
      });
      
      addToast('Profile updated successfully', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePhoto = async (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please upload an image file', 'error');
      return;
    }

    try {
      setPhotoUploading(true);
      const updated = await usersApi.uploadProfilePhoto(file);
      updateUser(updated);
      addToast('Profile photo updated', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || err.response?.data?.message || 'Photo upload failed', 'error');
    } finally {
      setPhotoUploading(false);
    }
  };

  const status = user?.verification_status || 'unverified';
  const statusLabel = VERIFICATION_LABELS[status] || status;
  const statusColor = VERIFICATION_COLORS[status] || 'bg-gray-100 text-gray-700';

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your driver account details, security credentials, and view verification status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Card: Account Card info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md">
            <div className="h-24 bg-gradient-to-r from-sky-400 to-indigo-500" />
            <CardContent className="relative pt-0 pb-6 text-center">
              <div className="flex justify-center -mt-12 mb-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-950 shadow-xl">
                    <AvatarImage src={user?.profile_photo_url || ''} />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                      {user ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    id="driver-profile-photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void handleProfilePhoto(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="absolute bottom-0 right-0 h-9 w-9 rounded-full shadow-lg"
                    disabled={photoUploading}
                    onClick={() => document.getElementById('driver-profile-photo')?.click()}
                    aria-label="Upload profile photo"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-950 dark:text-white">{user?.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{user?.email}</p>
              {photoUploading && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Uploading photo...</p>}
              
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-400">
                  <Shield className="w-3.5 h-3.5" />
                  Taxi Driver
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 mt-6 pt-6 text-left space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Joined {formattedDate}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{user?.phone || 'No phone registered'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Columns: Edit Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Form Section 1: Personal Info */}
            <Card className="border border-slate-100 dark:border-slate-800 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-sky-500" />
                  Personal Information
                </CardTitle>
                <CardDescription>Update your personal details. Keep your phone number active for booking updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        id="profile-name"
                        placeholder="Full name" 
                        className="pl-9"
                        {...register('name')} 
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-phone" className="text-sky-800 dark:text-sky-300 font-bold">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <Input 
                        id="profile-phone"
                        placeholder="Phone number" 
                        className="pl-9 border-2 border-sky-500 dark:border-sky-400 bg-sky-50/70 dark:bg-sky-950/40 text-slate-900 dark:text-white font-medium focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
                        {...register('phone')} 
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="profile-email"
                      type="email" 
                      value={user?.email || ''} 
                      disabled 
                      className="pl-9 bg-slate-50 dark:bg-slate-900 cursor-not-allowed border-dashed"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Email addresses are unique account identifiers and cannot be updated.</p>
                </div>
              </CardContent>
            </Card>

            {/* Form Section 2: Security */}
            <Card className="border border-slate-100 dark:border-slate-800 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Lock className="w-5 h-5 text-sky-500" />
                  Security Settings
                </CardTitle>
                <CardDescription>Change your account password. Leave these blank to keep your current password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        id="profile-password"
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="New password" 
                        className="pl-9 pr-10"
                        {...register('password')} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-password-confirmation">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        id="profile-password-confirmation"
                        type={showConfirmPassword ? 'text' : 'password'} 
                        placeholder="Confirm password" 
                        className="pl-9 pr-10"
                        {...register('password_confirmation')} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password_confirmation && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.password_confirmation.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" size="lg" className="px-6 gap-2" disabled={loading}>
                <Save className="w-4 h-4" />
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
