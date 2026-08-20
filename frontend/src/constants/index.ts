export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const APP_NAME = "Taxi-MeikSwe";

export const VERIFICATION_LABELS: Record<string, string> = {
  unverified: "Unverified",
  pending: "Pending",
  verified: "Verified",
  trusted: "Trusted",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const VERIFICATION_COLORS: Record<string, string> = {
  unverified: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  verified: "bg-green-100 text-green-700",
  trusted: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-red-100 text-red-700",
};

export function normalizeVerificationStatus(status?: string | null) {
  if (!status) return "unverified";

  switch (status.toUpperCase()) {
    case "APPROVED":
    case "VERIFIED":
      return "verified";
    case "PENDING":
      return "pending";
    case "REJECTED":
      return "rejected";
    case "TRUSTED":
      return "trusted";
    case "SUSPENDED":
    case "FREEZE":
      return "suspended";
    default:
      return status.toLowerCase();
  }
}

export function isKycApproved(status?: string | null) {
  return ["verified", "trusted"].includes(normalizeVerificationStatus(status));
}

export const BOOKING_LABELS: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  payment_pending: "Payment Pending",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const BOOKING_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-700",
  accepted: "bg-indigo-100 text-indigo-700",
  payment_pending: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

export const PAYMENT_METHODS = [
  { value: "KBZPay", label: "KBZPay", icon: "💳", qr_code: "/qr/kbzpay.png" },
  {
    value: "WavePay",
    label: "WavePay",
    icon: "📱",
    qr_code: "/qr/wavepay.png",
  },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏦", qr_code: null },
  { value: "cash", label: "Cash", icon: "💵", qr_code: null },
  { value: "AYAPay", label: "AyaPay", icon: "📲", qr_code: "/qr/ayapay.png" },
  { value: "cbpay", label: "CBPay", icon: "📱", qr_code: null },
];

export const FUEL_OPTIONS = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
  { value: "cng", label: "CNG" },
];

export const CAR_TYPE_OPTIONS = [
  { value: "sedan", label: "Sedan" },
  { value: "hatchback", label: "Hatchback" },
  { value: "suv", label: "SUV" },
  { value: "mpv", label: "MPV" },
  { value: "pickup", label: "Pickup" },
  { value: "van", label: "Van" },
];

export const MYANMAR_CITIES = [
  "Yangon",
  "Mandalay",
  "Naypyidaw",
  "Bago",
  "Mawlamyine",
  "Taunggyi",
  "Pathein",
  "Pyay",
  "Myitkyina",
  "Lashio",
  "Meiktila",
  "Monywa",
  "Sittwe",
  "Hpa-An",
  "Magway",
];

export const DOCUMENT_TYPES = [
  { key: "nrc_front", label: "NRC Front" },
  { key: "nrc_back", label: "NRC Back" },
  { key: "selfie", label: "Selfie Photo" },
  { key: "driving_license", label: "Driving License" },
  { key: "taxi_document", label: "Taxi Document" },
  { key: "owner_book", label: "Owner Book" },
  { key: "vehicle_registration", label: "Vehicle Registration" },
  { key: "insurance", label: "Insurance" },
];

export const OWNER_KYC_DOCUMENT_TYPES = [
  { key: "nrc_front", label: "NRC Front" },
  { key: "nrc_back", label: "NRC Back" },
];

export const SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor", color: "bg-yellow-100 text-yellow-700" },
  {
    value: "moderate",
    label: "Moderate",
    color: "bg-orange-100 text-orange-700",
  },
  { value: "severe", label: "Severe", color: "bg-red-100 text-red-700" },
];
