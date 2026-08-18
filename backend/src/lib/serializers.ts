export function toUserVerificationStatus(status?: string | null) {
  if (status === "APPROVED") return "verified";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function getPublicBaseUrl() {
  return process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
}

function toPublicUrl(path?: string | null) {
  if (!path) return null;
  if (/^(https?:\/\/|data:|blob:)/i.test(path)) return path;
  return `${getPublicBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function serializeOwnerDocuments(ownerProfile: any) {
  if (!ownerProfile) return [];

  const status = ownerProfile.adminApprovalStatus === "APPROVED"
    ? "approved"
    : ownerProfile.adminApprovalStatus === "REJECTED"
      ? "rejected"
      : "pending";

  const uploadedAt = ownerProfile.updatedAt?.toISOString?.() || ownerProfile.updatedAt;
  const reviewedAt = ownerProfile.approvedAt?.toISOString?.() || null;

  return [
    {
      id: `${ownerProfile.id}:nrc_front`,
      owner_profile_id: ownerProfile.id,
      type: "nrc_front",
      file_path: ownerProfile.nrcFrontImage,
      file_url: ownerProfile.nrcFrontImage,
      status: ownerProfile.nrcFrontImage ? status : "not_uploaded",
      admin_notes: null,
      uploaded_at: uploadedAt,
      reviewed_at: reviewedAt,
    },
    {
      id: `${ownerProfile.id}:nrc_back`,
      owner_profile_id: ownerProfile.id,
      type: "nrc_back",
      file_path: ownerProfile.nrcBackImage,
      file_url: ownerProfile.nrcBackImage,
      status: ownerProfile.nrcBackImage ? status : "not_uploaded",
      admin_notes: null,
      uploaded_at: uploadedAt,
      reviewed_at: reviewedAt,
    },
  ];
}

export function serializeUser(user: any) {
  const ownerApprovalStatus = user.role === "OWNER" ? user.ownerProfile?.adminApprovalStatus : null;
  const driverKycStatus = user.role === "DRIVER" ? user.driverProfile?.kycStatus : null;
  const verificationStatus =
    ownerApprovalStatus === "APPROVED" || ownerApprovalStatus === "REJECTED"
      ? ownerApprovalStatus
      : driverKycStatus === "APPROVED" || driverKycStatus === "REJECTED" || driverKycStatus === "SUBMITTED"
        ? driverKycStatus
        : user.verificationStatus;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    email_verified_at: user.emailVerified ? user.updatedAt.toISOString() : null,
    verification_status: toUserVerificationStatus(verificationStatus),
    suspension_reason: null,
    profile_photo_url: user.profilePhoto || null,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
    owner_documents: serializeOwnerDocuments(user.ownerProfile),
  };
}

export function serializeOwnerProfile(ownerProfile: any, user?: any) {
  if (!ownerProfile) return null;

  return {
    id: ownerProfile.id,
    user_id: ownerProfile.userId,
    nrc_text: ownerProfile.nrcText,
    nrc_front_image: ownerProfile.nrcFrontImage,
    nrc_back_image: ownerProfile.nrcBackImage,
    address: ownerProfile.address || user?.address || "",
    city: user?.city || "",
    township: user?.township || "",
    admin_approval_status: ownerProfile.adminApprovalStatus,
    approved_at: ownerProfile.approvedAt?.toISOString?.() || null,
    created_at: ownerProfile.createdAt.toISOString(),
    updated_at: ownerProfile.updatedAt.toISOString(),
    user: user ? serializeUser({ ...user, ownerProfile }) : undefined,
  };
}

export function isApprovedOwner(user: any) {
  return user.role === "OWNER" && (
    user.isVerified ||
    user.verificationStatus === "APPROVED" ||
    user.ownerProfile?.adminApprovalStatus === "APPROVED"
  );
}

export function serializeCar(car: any) {
  const dailyRate = Number(car.rentalPrice || 0);
  const imageEntries = car.carImages
    ? [
        ["front", car.carImages.frontImage],
        ["back", car.carImages.backImage],
        ["left", car.carImages.leftImage],
        ["right", car.carImages.rightImage],
      ]
    : [];
  const photos = imageEntries
    .map(([view, path], index) => {
      const url = toPublicUrl(path);
      if (!url) return null;

      return {
        id: `${car.id}:${view}`,
        car_id: car.id,
        url,
        is_primary: index === 0,
        created_at: car.carImages.createdAt.toISOString(),
      };
    })
    .filter(Boolean);

  return {
    id: car.id,
    owner_id: car.ownerId,
    brand: car.brand,
    model: car.model,
    year: car.year,
    color: car.color || "",
    license_plate: car.licenseNumber,
    license_number: car.licenseNumber,
    seat_capacity: 4,
    fuel_type: String(car.fuelType || "").toLowerCase(),
    car_type: "sedan",
    transmission: "auto",
    mileage: null,
    daily_rate: dailyRate,
    weekly_rate: null,
    monthly_rate: null,
    deposit_amount: Number(car.depositAmount || 0),
    location: car.owner?.township || "",
    city: car.owner?.city || "",
    description: car.rentalPeriod || null,
    features: [],
    status: toUserVerificationStatus(car.adminApprovalStatus),
    is_available: car.availabilityStatus === "AVAILABLE",
    owner_book: toPublicUrl(car.ownerBook),
    rental_period: car.rentalPeriod,
    rental_payment_type: car.rentalPaymentType,
    rental_type: car.rentalType,
    rental_price: dailyRate,
    availability_status: car.availabilityStatus,
    admin_approval_status: car.adminApprovalStatus,
    created_at: car.createdAt.toISOString(),
    updated_at: car.updatedAt.toISOString(),
    owner: car.owner ? serializeUser(car.owner) : undefined,
    photos,
    images: car.carImages ? {
      front_image: toPublicUrl(car.carImages.frontImage),
      back_image: toPublicUrl(car.carImages.backImage),
      left_image: toPublicUrl(car.carImages.leftImage),
      right_image: toPublicUrl(car.carImages.rightImage),
    } : null,
  };
}

export function applicationStatusToBookingStatus(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") return "accepted";
  if (status === "REJECTED") return "cancelled";
  return "requested";
}

export function applicationToBookingStatus(application: any) {
  if (application.ownerApprovalStatus === "REJECTED" || application.adminApprovalStatus === "REJECTED") {
    return "cancelled";
  }
  if (application.payment?.status === "confirmed") return "active";
  if (application.payment?.status === "under_review") return "payment_pending";
  if (application.adminApprovalStatus === "APPROVED") return "accepted";
  if (application.ownerApprovalStatus === "APPROVED") return "accepted";
  return applicationStatusToBookingStatus(application.ownerApprovalStatus);
}

export function serializeBooking(application: any) {
  const createdAt = application.createdAt?.toISOString?.() || application.createdAt;
  const updatedAt = application.updatedAt?.toISOString?.() || application.updatedAt;
  const startDate = application.createdAt?.toISOString?.() || createdAt;
  const endDate = application.createdAt
    ? new Date(application.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : createdAt;
  const dailyRate = Number(application.car?.rentalPrice || 0);

  return {
    id: application.id,
    car_id: application.carId,
    driver_id: application.driverId,
    owner_id: application.ownerId,
    start_date: startDate,
    end_date: endDate,
    total_amount: dailyRate,
    status: applicationToBookingStatus(application),
    owner_approval_status: application.ownerApprovalStatus,
    admin_approval_status: application.adminApprovalStatus || "PENDING",
    agreement_sent_at: application.agreementSentAt?.toISOString?.() || null,
    owner_agreement_agreed_at: application.ownerAgreementAgreedAt?.toISOString?.() || null,
    driver_agreement_agreed_at: application.driverAgreementAgreedAt?.toISOString?.() || null,
    driver_notes: application.wardRecommendationLetter || null,
    owner_notes: null,
    rejection_reason: application.ownerApprovalStatus === "REJECTED"
      ? "Rejected by owner"
      : application.adminApprovalStatus === "REJECTED"
        ? "Rejected by admin"
        : null,
    created_at: createdAt,
    updated_at: updatedAt,
    car: application.car ? serializeCar(application.car) : undefined,
    driver: application.driver ? serializeUser(application.driver) : undefined,
    owner: application.owner ? serializeUser(application.owner) : undefined,
  };
}

export function serializePayment(payment: any) {
  if (!payment) return null;
  const payerRole = payment.payer_role || "DRIVER";
  const transferFromName =
    payment.transfer_from_name ||
    payment.payer_name ||
    (payerRole === "OWNER" ? payment.owner_name : payment.driver_name) ||
    null;
  const transferToName =
    payment.transfer_to_name ||
    payment.payee_name ||
    "Taxi Meik Swe Agency";

  return {
    id: payment.id,
    booking_id: payment.booking_id,
    user_id: payment.user_id,
    amount: Number(payment.amount || 0),
    method: payment.method,
    payer_role: payerRole,
    payment_purpose: payment.payment_purpose || "rental_payment",
    transfer_from_name: transferFromName,
    transfer_to_name: transferToName,
    driver_name: payment.driver_name || null,
    owner_name: payment.owner_name || null,
    commission_rate: Number(payment.commission_rate || 0),
    commission_amount: Number(payment.commission_amount || 0),
    transaction_id: payment.transaction_id,
    screenshot_url: payment.screenshot_url,
    status: payment.status,
    admin_notes: payment.admin_notes,
    paid_at: payment.paid_at?.toISOString?.() || payment.paid_at || null,
    confirmed_at: payment.confirmed_at?.toISOString?.() || payment.confirmed_at || null,
    confirmed_by: payment.confirmed_by,
    created_at: payment.created_at?.toISOString?.() || payment.created_at,
    updated_at: payment.updated_at?.toISOString?.() || payment.updated_at,
  };
}

export function serializeDeposit(deposit: any) {
  if (!deposit) return null;
  return {
    id: deposit.id,
    booking_id: deposit.booking_id,
    driver_id: deposit.driver_id,
    amount: Number(deposit.amount || 0),
    status: deposit.status,
    payment_method: deposit.payment_method,
    screenshot_url: deposit.screenshot_url,
    paid_at: deposit.paid_at?.toISOString?.() || deposit.paid_at || null,
    released_at: deposit.released_at?.toISOString?.() || deposit.released_at || null,
    deducted_amount: deposit.deducted_amount ? Number(deposit.deducted_amount) : null,
    deduction_reason: deposit.deduction_reason,
    created_at: deposit.created_at?.toISOString?.() || deposit.created_at,
    updated_at: deposit.updated_at?.toISOString?.() || deposit.updated_at,
  };
}

export function serializeIncompleteDeposit(application: any) {
  return {
    id: `incomplete-${application.id}`,
    booking_id: application.id,
    driver_id: application.driverId,
    amount: Number(application.car?.depositAmount || 0),
    status: "incomplete",
    payment_method: null,
    screenshot_url: null,
    paid_at: null,
    released_at: null,
    deducted_amount: null,
    deduction_reason: null,
    created_at: application.createdAt?.toISOString?.() || application.createdAt,
    updated_at: application.updatedAt?.toISOString?.() || application.updatedAt,
  };
}

export function serializeNotification(notification: any) {
  return {
    id: notification.id,
    user_id: notification.receiverId,
    title: notification.title,
    message: notification.message,
    type: notification.type || "info",
    is_read: notification.isRead,
    related_type: notification.type || null,
    related_id: notification.entityId || null,
    created_at: notification.createdAt.toISOString(),
  };
}
