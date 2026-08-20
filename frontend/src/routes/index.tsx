import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { GuestRoute } from './GuestRoute'
import { UserRole } from '@/types'

// Public pages
import { LandingPage } from '@/features/public/LandingPage'
import { AboutPage } from '@/features/public/AboutPage'
import { ContactPage } from '@/features/public/ContactPage'
import { FAQPage } from '@/features/public/FAQPage'
import { TermsPage } from '@/features/public/TermsPage'
import { PrivacyPage } from '@/features/public/PrivacyPage'
// import { BrowseCarsPage } from '@/features/public/BrowseCarsPage'
import { CarDetailsPage } from '@/features/public/CarDetailsPage'

// Auth pages
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'

// Owner pages
import { OwnerDashboardPage } from '@/features/owner/OwnerDashboardPage'
import { OwnerCarsPage } from '@/features/owner/OwnerCarsPage'
import { OwnerCarFormPage } from '@/features/owner/OwnerCarFormPage'
import { OwnerBookingsPage } from '@/features/owner/OwnerBookingsPage'
import { OwnerEarningsPage } from '@/features/owner/OwnerEarningsPage'
import { OwnerPaymentsPage } from '@/features/owner/OwnerPaymentsPage'
import { OwnerDepositsPage } from '@/features/owner/OwnerDepositsPage'
import { OwnerReviewsPage } from '@/features/owner/OwnerReviewsPage'
import { OwnerDisputesPage } from '@/features/owner/OwnerDisputesPage'
import { OwnerDocumentsPage } from '@/features/owner/OwnerDocumentsPage'
import { OwnerProfilePage } from '@/features/owner/OwnerProfilePage'
import { OwnerAIMatchmakerPage } from '@/features/owner/OwnerAIMatchmakerPage'

// Driver pages
import { DriverDashboardPage } from '@/features/driver/DriverDashboardPage'
import { DriverBrowseCarsPage } from '@/features/driver/DriverBrowseCarsPage'
import { DriverCarDetailPage } from '@/features/driver/DriverCarDetailPage'
import { DriverBookingsPage } from '@/features/driver/DriverBookingsPage'
import { DriverBookingDetailPage } from '@/features/driver/DriverBookingDetailPage'
import { DriverPaymentsPage } from '@/features/driver/DriverPaymentsPage'
import { DriverDepositsPage } from '@/features/driver/DriverDepositsPage'
import { KYCPage } from '@/features/driver/KYCPage'
import { DriverDisputesPage } from '@/features/driver/DriverDisputesPage'
import { DriverReviewsPage } from '@/features/driver/DriverReviewsPage'
import { DriverProfilePage } from '@/features/driver/DriverProfilePage'
import { AgreementFormPage } from '@/features/shared/AgreementFormPage'
import { AgreementsPage } from '@/features/shared/AgreementsPage'

// Admin pages
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage'
import { AdminVerificationsPage } from '@/features/admin/AdminVerificationsPage'
import { AdminUsersPage } from '@/features/admin/AdminUsersPage'
import { AdminBookingsPage } from '@/features/admin/AdminBookingsPage'
import { AdminPaymentsPage } from '@/features/admin/AdminPaymentsPage'
import { AdminDisputesPage } from '@/features/admin/AdminDisputesPage'
import { AdminDepositsPage } from '@/features/admin/AdminDepositsPage'
import { AdminAuditLogPage } from '@/features/admin/AdminAuditLogPage'
import { AdminNotificationsPage } from '@/features/admin/AdminNotificationsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <GuestRoute><LandingPage /></GuestRoute> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'faq', element: <FAQPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      // { path: 'cars', element: <BrowseCarsPage /> },
      { path: 'cars/:id', element: <CarDetailsPage /> },
    ],
  },

  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
      { path: 'register', element: <GuestRoute><RegisterPage /></GuestRoute> },
      { path: 'forgot-password', element: <GuestRoute><ForgotPasswordPage /></GuestRoute> },
      { path: 'reset-password/:token', element: <GuestRoute><ResetPasswordPage /></GuestRoute> },
    ],
  },

  {
    path: '/owner',
    element: (
      <ProtectedRoute roles={[UserRole.Owner]}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <OwnerDashboardPage /> },
      { path: 'cars', element: <OwnerCarsPage /> },
      { path: 'cars/new', element: <OwnerCarFormPage /> },
      { path: 'cars/:id/edit', element: <OwnerCarFormPage /> },
      { path: 'bookings', element: <OwnerBookingsPage /> },
      { path: 'ai-matchmaker', element: <OwnerAIMatchmakerPage /> },
      { path: 'earnings', element: <OwnerEarningsPage /> },
      { path: 'payments', element: <OwnerPaymentsPage /> },
      { path: 'deposits', element: <OwnerDepositsPage /> },
      { path: 'reviews', element: <OwnerReviewsPage /> },
      { path: 'disputes', element: <OwnerDisputesPage /> },
      { path: 'notifications', element: <AdminNotificationsPage /> },
      { path: 'documents', element: <OwnerDocumentsPage /> },
      { path: 'profile', element: <OwnerProfilePage /> },
      { path: 'agreements', element: <AgreementsPage /> },
      { path: 'agreements/:id', element: <AgreementFormPage /> },
    ],
  },

  {
    path: '/driver',
    element: (
      <ProtectedRoute roles={[UserRole.Driver]}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DriverDashboardPage /> },
      { path: 'cars', element: <DriverBrowseCarsPage /> },
      { path: 'cars/:id', element: <DriverCarDetailPage /> },
      { path: 'bookings', element: <DriverBookingsPage /> },
      { path: 'bookings/:id', element: <DriverBookingDetailPage /> },
      { path: 'payments', element: <DriverPaymentsPage /> },
      { path: 'deposits', element: <DriverDepositsPage /> },
      { path: 'documents', element: <KYCPage /> },
      { path: 'disputes', element: <DriverDisputesPage /> },
      { path: 'reviews', element: <DriverReviewsPage /> },
      { path: 'notifications', element: <AdminNotificationsPage /> },
      { path: 'profile', element: <DriverProfilePage /> },
      { path: 'agreements', element: <AgreementsPage /> },
      { path: 'agreements/:id', element: <AgreementFormPage /> },
    ],
  },

  {
    path: '/admin',
    element: (
      <ProtectedRoute roles={[UserRole.Admin]}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'verifications/owners', element: <AdminVerificationsPage type="owners" /> },
      { path: 'verifications/drivers', element: <AdminVerificationsPage type="drivers" /> },
      { path: 'verifications/cars', element: <AdminVerificationsPage type="cars" /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'bookings', element: <AdminBookingsPage /> },
      { path: 'payments', element: <AdminPaymentsPage /> },
      { path: 'disputes', element: <AdminDisputesPage /> },
      { path: 'deposits', element: <AdminDepositsPage /> },
      { path: 'audit-log', element: <AdminAuditLogPage /> },
      { path: 'notifications', element: <AdminNotificationsPage /> },
      { path: 'agreements', element: <AgreementsPage /> },
      { path: 'agreements/:id', element: <AgreementFormPage /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
