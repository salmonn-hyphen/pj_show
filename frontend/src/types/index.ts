// ===== ENUMS (as const objects for TypeScript 6 erasableSyntaxOnly compat) =====
export const UserRole = {
  Admin: "ADMIN",
  Owner: "OWNER",
  Driver: "DRIVER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const VerificationStatus = {
  Unverified: "unverified",
  Pending: "pending",
  Verified: "verified",
  Trusted: "trusted",
  Rejected: "rejected",
  Suspended: "suspended",
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const BookingStatus = {
  Requested: "requested",
  Accepted: "accepted",
  PaymentPending: "payment_pending",
  Active: "active",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentStatus = {
  Incomplete: "incomplete",
  Pending: "pending",
  UnderReview: "under_review",
  Confirmed: "confirmed",
  Failed: "failed",
  Refunded: "refunded",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const DisputeStatus = {
  Open: "open",
  UnderReview: "under_review",
  Resolved: "resolved",
  Closed: "closed",
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const DocumentStatus = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
  NotUploaded: "not_uploaded",
} as const;
export type DocumentStatus =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const DepositStatus = {
  Held: "held",
  Frozen: "frozen",
  Released: "released",
  Deducted: "deducted",
} as const;
export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus];

export const FuelType = {
  Petrol: "petrol",
  Diesel: "diesel",
  Electric: "electric",
  EV: "ev",
  Hybrid: "hybrid",
  CNG: "cng",
} as const;
export type FuelType = (typeof FuelType)[keyof typeof FuelType];

export const CarType = {
  Sedan: "sedan",
  Hatchback: "hatchback",
  SUV: "suv",
  MPV: "mpv",
  Pickup: "pickup",
  Van: "van",
} as const;
export type CarType = (typeof CarType)[keyof typeof CarType];

export const PaymentMethod = {
  KBZPay: "KBZPay",
  WavePay: "WavePay",
  BankTransfer: "bank_transfer",
  Cash: "cash",
  AyaPay: "AYAPay",
  CBPay: "CBPay",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ===== USER TYPES =====
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  email_verified_at: string | null;
  verification_status: VerificationStatus;
  suspension_reason: string | null;
  profile_photo_url: string | null;
  city?: string | null;
  township?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerProfile {
  id: string;
  user_id: string;
  nrc_text: string;
  nrc_number?: string;
  nrc_front_image: string;
  nrc_back_image: string;
  address: string;
  city: string;
  township: string;
  admin_approval_status: "PENDING" | "APPROVED" | "REJECTED" | "FREEZE";
  approved_at: string | null;
  phone_secondary?: string | null;
  business_name?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface OwnerDocument {
  id: string;
  owner_profile_id: string;
  type: string;
  file_path: string;
  file_url: string;
  status: DocumentStatus;
  admin_notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

export interface DriverProfile {
  id: number;
  user_id: number;
  nrc_number: string;
  address: string;
  city: string;
  township: string;
  phone_secondary: string | null;
  license_number: string;
  license_expiry: string;
  years_experience: number;
  bio: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface DriverDocument {
  id: number;
  driver_profile_id: number;
  type: string;
  file_path: string;
  file_url: string;
  status: DocumentStatus;
  admin_notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

// ===== CAR TYPES =====
export interface Car {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  license_number?: string;
  seat_capacity: number;
  fuel_type: FuelType;
  car_type: CarType;
  transmission: string;
  mileage: number | null;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  deposit_amount: number;
  location: string;
  city: string;
  description: string | null;
  features: string[];
  status: VerificationStatus;
  is_available: boolean;
  admin_approval_status?: "PENDING" | "APPROVED" | "REJECTED" | "FREEZE";
  created_at: string;
  updated_at: string;
  owner?: User;
  photos?: CarPhoto[];
  owner_book?: string;
  rental_period?: string | null;
  rental_payment_type?: "DAILY" | "WEEKLY" | "MONTHLY";
  rental_type?: "DRIVER_HOME" | "OWNER_HOME";
  rental_price?: number;
  images?: {
    front_image: string;
    back_image: string;
    left_image: string;
    right_image: string;
  } | null;
}

export interface CarPhoto {
  id: number;
  car_id: number;
  url: string;
  is_primary: boolean;
  created_at: string;
}

export interface CarDocument {
  id: number;
  car_id: number;
  type: string;
  file_path: string;
  file_url: string;
  status: DocumentStatus;
  admin_notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

// ===== BOOKING TYPES =====
export interface Booking {
  id: string | number;
  car_id: string | number;
  driver_id: string | number;
  owner_id: string | number;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: BookingStatus;
  agreement_sent_at?: string | null;
  owner_agreement_agreed_at?: string | null;
  driver_agreement_agreed_at?: string | null;
  driver_notes: string | null;
  owner_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  car?: Car;
  driver?: User;
  owner?: User;
  payment?: Payment;
  owner_payment?: Payment;
  deposit?: Deposit;
  payment_status?: PaymentStatus | "incomplete";
  owner_payment_status?: PaymentStatus | "incomplete";
  deposit_status?: DepositStatus | "incomplete";
  inspection_pre?: Inspection;
  inspection_post?: Inspection;
}

// ===== PAYMENT TYPES =====
export interface Payment {
  id: string | number;
  booking_id: string | number;
  user_id: string | number;
  amount: number;
  method: PaymentMethod | null;
  payer_role?: "DRIVER" | "OWNER";
  payment_purpose?: string;
  transfer_from_name?: string | null;
  transfer_to_name?: string | null;
  driver_name?: string | null;
  owner_name?: string | null;
  commission_rate?: number;
  commission_amount?: number;
  transaction_id: string | null;
  screenshot_url: string | null;
  status: PaymentStatus;
  admin_notes: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | number | null;
  created_at: string;
  updated_at: string;
}

// ===== DEPOSIT TYPES =====
export interface Deposit {
  id: string | number;
  booking_id: string | number;
  driver_id: string | number;
  amount: number;
  status: DepositStatus;
  payment_method: PaymentMethod | null;
  screenshot_url: string | null;
  paid_at: string | null;
  released_at: string | null;
  deducted_amount: number | null;
  deduction_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ===== INSPECTION TYPES =====
export interface Inspection {
  id: number;
  booking_id: number;
  type: "pre" | "post";
  inspector_id: number;
  notes: string | null;
  fuel_level: number;
  mileage: number;
  condition_rating: number;
  photos: string[];
  signed_by_driver: boolean;
  signed_by_owner: boolean;
  created_at: string;
  updated_at: string;
  inspector?: User;
}

// ===== DAMAGE REPORT TYPES =====
export interface DamageReport {
  id: number;
  booking_id: number;
  reported_by: number;
  description: string;
  severity: "minor" | "moderate" | "severe";
  estimated_cost: number | null;
  evidence_photos: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  reporter?: User;
}

// ===== DISPUTE TYPES =====
export interface Dispute {
  id: number;
  booking_id: number;
  raised_by: number;
  raised_against: number;
  reason: string;
  status: DisputeStatus;
  admin_id: number | null;
  resolution: string | null;
  deposit_deduction: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  raiser?: User;
  target?: User;
  admin?: User;
  timeline?: DisputeTimeline[];
}

export interface DisputeTimeline {
  id: number;
  dispute_id: number;
  user_id: number;
  action: string;
  notes: string | null;
  created_at: string;
  user?: User;
}

// ===== REVIEW TYPES =====
export interface Review {
  id: number;
  booking_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: User;
  reviewee?: User;
}

// ===== ADMIN TYPES =====
export interface AdminAction {
  id: number;
  admin_id: number;
  action_type: string;
  target_type: string;
  target_id: number;
  description: string;
  created_at: string;
  admin?: User;
}

// ===== NOTIFICATION TYPES =====
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
}

// ===== AUTH TYPES =====
export interface LoginRequest {
  phone?: string;
  email?: string;
  password: string;
}

export interface RegisterOwnerRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  nrc_number: string;
  address: string;
  city: string;
  township: string;
}

export interface RegisterDriverRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  nrc_number: string;
  address: string;
  city: string;
  township: string;
  license_number: string;
  years_experience: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// ===== DASHBOARD STATS =====
export interface OwnerDashboardStats {
  total_cars: number;
  verified_cars: number;
  active_rentals: number;
  pending_bookings: number;
  total_earnings: number;
  owner_net_earning?: number;
  monthly_earnings: { month: string; amount: number }[];
  recent_bookings: Booking[];
}

export interface DriverDashboardStats {
  active_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  deposit_status: DepositStatus | null;
  verification_progress: number;
  recent_bookings: Booking[];
  recommended_cars: Car[];
}

export interface AdminDashboardStats {
  total_users: number;
  total_owners: number;
  total_drivers: number;
  pending_owner_verifications: number;
  pending_driver_verifications: number;
  pending_car_verifications: number;
  active_bookings: number;
  active_disputes: number;
  pending_payment_approvals: number;
  total_revenue: number;
  recent_activities: AdminAction[];
  revenue_chart: { month: string; amount: number }[];
}
