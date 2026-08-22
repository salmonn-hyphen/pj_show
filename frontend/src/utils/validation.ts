import { z } from 'zod'

const myanmarNrcRegex = /^(1[0-4]|[1-9])\/[A-Z_]{3,10}\([NEPS]\)\d{6}$/

const phoneSchema = z
  .string()
  .min(9, 'Phone number must be between 9 and 15 characters')
  .max(15, 'Phone number must be between 9 and 15 characters')
  .regex(/^\+?\d+$/, 'Phone number must contain only numbers and optional leading +')

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter')
  .regex(/[0-9]/, 'Password must include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character')

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Full name must be at least 2 characters')
  .regex(/^[A-Za-z\s]+$/, 'Name must contain only letters and spaces')
  .max(100, 'Name must be at most 100 characters')

const stringField = z
  .string()
  .trim()
  .min(1, 'This field is required')

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
})

const registerBaseSchema = z.object({
  name: nameSchema,
  email: z.string().email('Invalid email address'),
  phone: phoneSchema,
  password: passwordSchema,
  password_confirmation: z.string(),
  nrc_number: z.string().regex(myanmarNrcRegex, 'Invalid Myanmar NRC format (e.g., 12/KAMANA(N)123456)'),
  address: stringField.min(5, 'Address must be at least 5 characters'),
  city: stringField,
  township: stringField,
})

export const registerOwnerStepOneSchema = registerBaseSchema.pick({
  name: true,
  email: true,
  phone: true,
  password: true,
  password_confirmation: true,
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})

export const registerOwnerStepTwoSchema = registerBaseSchema.pick({
  nrc_number: true,
  address: true,
  city: true,
  township: true,
})

export const registerOwnerSchema = registerBaseSchema.refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})

export const registerDriverStepOneSchema = registerBaseSchema.pick({
  name: true,
  email: true,
  phone: true,
  password: true,
  password_confirmation: true,
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})

export const registerDriverStepTwoSchema = registerBaseSchema.pick({
  nrc_number: true,
  address: true,
  city: true,
  township: true,
}).extend({
  license_number: z.string().min(3, 'Invalid license number').regex(/^\d+$/, 'License number must contain only numbers'),
  years_experience: z.number().min(0, 'Invalid experience').max(30, 'Experience must not exceed 30 years'),
})

export const registerDriverSchema = registerBaseSchema.extend({
  license_number: z.string().min(3, 'Invalid license number').regex(/^\d+$/, 'License number must contain only numbers'),
  years_experience: z.number().min(0, 'Invalid experience').max(30, 'Experience must not exceed 30 years'),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})

export const carSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(2000, 'Year must be 2000 or later').max(2030, 'Invalid year'),
  color: z.string().min(1, 'Color is required'),
  license_plate: z.string().min(1, 'License plate is required'),
  seat_capacity: z.number().min(1, 'Must have at least 1 seat').max(50, 'Too many seats'),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'cng']),
  car_type: z.enum(['sedan', 'hatchback', 'suv', 'mpv', 'pickup', 'van']),
  transmission: z.string().min(1, 'Transmission is required'),
  mileage: z.number().optional(),
  daily_rate: z.number().min(1000, 'Daily rate must be at least 1,000 MMK'),
  weekly_rate: z.number().optional(),
  monthly_rate: z.number().optional(),
  deposit_amount: z.number().min(0, 'Deposit must be 0 or more'),
  location: z.string().min(1, 'Location is required'),
  city: z.string().min(1, 'City is required'),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
})

export const bookingSchema = z.object({
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  driver_notes: z.string().optional(),
})

export const paymentSchema = z.object({
  method: z.enum(['kbzpay', 'wavepay', 'bank_transfer', 'cash', 'ayapay', 'cbpay']),
  transaction_id: z.string().optional(),
  screenshot: z.any().optional(),
})

export const damageReportSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters'),
  severity: z.enum(['minor', 'moderate', 'severe']),
  estimated_cost: z.number().optional(),
})

export const disputeSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5, 'Rating must be 1-5'),
  comment: z.string().optional(),
})

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const newPasswordSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})

export const profileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional(),
    city: z.string().optional(),
    township: z.string().optional(),
    bio: z.string().optional(),
    password: z.string().optional().or(z.literal("")),
    password_confirmation: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.password && data.password !== "") {
        return data.password === data.password_confirmation;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["password_confirmation"],
    }
  )
  .refine(
    (data) => {
      if (data.password && data.password !== "") {
        const res = passwordSchema.safeParse(data.password);
        return res.success;
      }
      return true;
    },
    {
      message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      path: ["password"],
    }
  );

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterOwnerFormData = z.infer<typeof registerOwnerSchema>
export type RegisterDriverFormData = z.infer<typeof registerDriverSchema>
export type CarFormData = z.infer<typeof carSchema>
export type BookingFormData = z.infer<typeof bookingSchema>
export type PaymentFormData = z.infer<typeof paymentSchema>
export type DamageReportFormData = z.infer<typeof damageReportSchema>
export type DisputeFormData = z.infer<typeof disputeSchema>
export type ReviewFormData = z.infer<typeof reviewSchema>
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
export type ProfileFormData = z.infer<typeof profileSchema>
