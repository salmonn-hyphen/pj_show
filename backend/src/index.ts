import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { configureCoreMiddleware, configureStaticUploads } from './lib/app-config.js';
import { paymentUploadDir } from './lib/payment-upload.js';
import { profilePhotoUploadDir } from './lib/profile-photo-upload.js';

import authRouter from './routes/auth.routes.js';
import contactRouter from './routes/contact.routes.js';
import driverRouter from './routes/driver.routes.js';
import ownerRouter from './routes/owner.routes.js';
import userRouter from './routes/user.routes.js';
import carsRouter from './routes/cars.routes.js';
import ownerCarsRouter from './routes/owner-cars.routes.js';
import driverBookingsRouter from './routes/driver-bookings.routes.js';
import ownerBookingsRouter from './routes/owner-bookings.routes.js';
import adminBookingsRouter from './routes/admin-bookings.routes.js';
import adminVerificationsRouter from './routes/admin-verifications.routes.js';
import adminDriverRouter from './routes/admin-driver-verifications.routes.js';
import agreementsRouter from './routes/agreements.routes.js';
import bookingPaymentsRouter from './routes/booking-payments.routes.js';
import depositsRouter from './routes/deposits.routes.js';
import notificationsRouter from './routes/notifications.routes.js';
import aiMatchingRouter from './routes/ai-matching.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

configureCoreMiddleware(app);
configureStaticUploads(app, __dirname, paymentUploadDir, profilePhotoUploadDir);

// Auth routes
app.use("/api", authRouter);

// Public routes
app.use("/api", contactRouter);
app.use("/api/cars", carsRouter);

// User routes
app.use("/api/user", userRouter);

// Driver routes
app.use("/api/driver", driverRouter);
app.use("/api/driver/bookings", driverBookingsRouter);

// Owner routes
app.use("/api/owner", ownerRouter);
app.use("/api/owner/cars", ownerCarsRouter);
app.use("/api/owner/bookings", ownerBookingsRouter);

// Admin routes
app.use("/api/admin", adminDriverRouter);
app.use("/api/admin", adminVerificationsRouter);
app.use("/api/admin/bookings", adminBookingsRouter);

// Shared routes
app.use("/api/agreements", agreementsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api", bookingPaymentsRouter);
app.use("/api", depositsRouter);
app.use("/api", aiMatchingRouter);

// Better Auth handler (must come LAST)
app.all("/api/auth/*splat", toNodeHandler(auth));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
