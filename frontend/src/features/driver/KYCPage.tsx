import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast, useAuth } from "@/providers";
import { usersApi } from "@/api";
import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ArrowRight,
  FileImage,
  RefreshCw,
  Camera,
  IdCard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

function VerificationStateCard({
  icon,
  title,
  description,
  accentClass,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6 text-center sm:p-8">
            <div
              className={cn(
                "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl border",
                accentClass,
              )}
            >
              {icon}
            </div>
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {description}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {children}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export function KYCPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [uploading, setUploading] = useState(false);

  // File States
  const [nrcFront, setNrcFront] = useState<File | null>(null);
  const [nrcBack, setNrcBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [drivingLicenseFront, setDrivingLicenseFront] = useState<File | null>(
    null,
  );
  const [drivingLicenseBack, setDrivingLicenseBack] = useState<File | null>(
    null,
  );

  // Preview URLs
  const [previews, setPreviews] = useState<Record<string, string>>({
    nrcFront: "",
    nrcBack: "",
    selfie: "",
    drivingLicenseFront: "",
    drivingLicenseBack: "",
  });

  const fileInputRefs = {
    nrcFront: useRef<HTMLInputElement>(null),
    nrcBack: useRef<HTMLInputElement>(null),
    selfie: useRef<HTMLInputElement>(null),
    drivingLicenseFront: useRef<HTMLInputElement>(null),
    drivingLicenseBack: useRef<HTMLInputElement>(null),
  };

  const fetchKycStatus = async () => {
    try {
      setLoadingStatus(true);
      const data = await usersApi.getKycStatus();
      setKycStatus(data?.kycStatus || "PENDING");
    } catch (err) {
      // Fallback to checking the local user object's verification_status
      if (
        user?.verification_status === "verified" ||
        user?.verification_status === "trusted"
      ) {
        setKycStatus("APPROVED");
      } else {
        setKycStatus("PENDING");
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();

    // Revoke object URLs on unmount to prevent memory leaks
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleFileChange = (field: string, file: File) => {
    // 5MB validation
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      addToast(`${file.name} exceeds 5MB size limit`, "error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      addToast("Please upload image files only", "error");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviews((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]);
      return { ...prev, [field]: previewUrl };
    });

    if (field === "nrcFront") setNrcFront(file);
    if (field === "nrcBack") setNrcBack(file);
    if (field === "selfie") setSelfie(file);
    if (field === "drivingLicenseFront") setDrivingLicenseFront(file);
    if (field === "drivingLicenseBack") setDrivingLicenseBack(file);
  };

  const clearFile = (field: string) => {
    setPreviews((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]);
      return { ...prev, [field]: "" };
    });

    if (field === "nrcFront") setNrcFront(null);
    if (field === "nrcBack") setNrcBack(null);
    if (field === "selfie") setSelfie(null);
    if (field === "drivingLicenseFront") setDrivingLicenseFront(null);
    if (field === "drivingLicenseBack") setDrivingLicenseBack(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(field, file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !nrcFront ||
      !nrcBack ||
      !selfie ||
      !drivingLicenseFront ||
      !drivingLicenseBack
    ) {
      addToast("Please upload all 5 required documents", "error");
      return;
    }

    const formData = new FormData();
    formData.append("nrcFront", nrcFront);
    formData.append("nrcBack", nrcBack);
    formData.append("selfie", selfie);
    formData.append("drivingLicenseFront", drivingLicenseFront);
    formData.append("drivingLicenseBack", drivingLicenseBack);

    try {
      setUploading(true);
      await usersApi.uploadKycDocuments(formData);
      addToast("Identity documents uploaded successfully!", "success");
      setKycStatus("SUBMITTED");
    } catch (err: any) {
      addToast(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Upload failed",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center shadow-sm">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-amber-600" />
        <p className="text-sm text-slate-500">
          Retrieving verification records...
        </p>
      </div>
    );
  }

  // 1. APPROVED VIEW
  if (kycStatus === "APPROVED") {
    return (
      <VerificationStateCard
        icon={<ShieldCheck className="h-8 w-8 text-emerald-600" />}
        title="Identity Verified"
        description="Congratulations! Your KYC verification has been approved. You now have full access to request, accept, and manage rentals."
        accentClass="border-emerald-200 bg-emerald-50"
      >
        <Button size="lg" onClick={() => navigate("/driver/bookings")} className="gap-2 px-8">
          View My Bookings <ArrowRight className="h-4 w-4" />
        </Button>
      </VerificationStateCard>
    );
  }

  // 2. SUBMITTED / PENDING VIEW
  if (kycStatus === "SUBMITTED") {
    return (
      <VerificationStateCard
        icon={<Clock className="h-8 w-8 text-amber-600" />}
        title="Verification Pending"
        description="Your identity documents have been submitted and are currently under review by our administration."
        accentClass="border-amber-200 bg-amber-50"
      >
        <Button variant="outline" onClick={() => navigate("/driver")}>
          Back to Dashboard
        </Button>
        <Button onClick={fetchKycStatus} variant="ghost" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh Status
        </Button>
      </VerificationStateCard>
    );
  }

  // 3. REJECTED VIEW
  if (kycStatus === "REJECTED") {
    return (
      <VerificationStateCard
        icon={<ShieldAlert className="h-8 w-8 text-red-600" />}
        title="Verification Rejected"
        description="Your previous document submission could not be verified. Upload clearer images with details that match your account profile."
        accentClass="border-red-200 bg-red-50"
      >
        <Button onClick={() => setKycStatus("PENDING")} size="lg" className="gap-2 px-8">
          Re-upload Documents <RefreshCw className="h-4 w-4" />
        </Button>
      </VerificationStateCard>
    );
  }

  // 4. UPLOAD FORM (PENDING STATE)
  const uploadFields = [
    {
      key: "nrcFront",
      label: "NRC Front Side",
      icon: <IdCard className="w-6 h-6" />,
    },
    {
      key: "nrcBack",
      label: "NRC Back Side",
      icon: <IdCard className="w-6 h-6" />,
    },
    {
      key: "selfie",
      label: "Selfie with NRC / Photo",
      icon: <Camera className="w-6 h-6" />,
    },
    {
      key: "drivingLicenseFront",
      label: "Driving License Front Side",
      icon: <FileImage className="w-6 h-6" />,
    },
    {
      key: "drivingLicenseBack",
      label: "Driving License Back Side",
      icon: <FileImage className="w-6 h-6" />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
          KYC Verification
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload clear images of your documents to verify your driver credentials and unlock car bookings.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-700">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">Driver KYC Required</p>
          <p className="text-sm opacity-90">
            Submit NRC photos, a selfie, and both sides of your driving license for admin review.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {uploadFields.map((field) => {
            const preview = previews[field.key];
            const file =
              field.key === "nrcFront"
                ? nrcFront
                : field.key === "nrcBack"
                  ? nrcBack
                  : field.key === "selfie"
                    ? selfie
                    : field.key === "drivingLicenseFront"
                      ? drivingLicenseFront
                      : drivingLicenseBack;

            return (
              <Card
                key={field.key}
                className="flex h-[360px] flex-col overflow-hidden"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                      {field.icon}
                    </span>
                    {field.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-center">
                  {preview ? (
                    <div className="group relative mx-auto aspect-video max-h-60 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <img
                        src={preview}
                        alt="Upload Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => clearFile(field.key)}
                          className="h-8 w-8 rounded-full p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, field.key)}
                      onClick={() =>
                        fileInputRefs[
                          field.key as
                            | "nrcFront"
                            | "nrcBack"
                            | "selfie"
                            | "drivingLicenseFront"
                            | "drivingLicenseBack"
                        ].current?.click()
                      }
                      className={cn(
                        "flex h-60 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition-all",
                        "hover:border-amber-300 hover:bg-amber-50/60",
                      )}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        ref={
                          fileInputRefs[
                            field.key as
                              | "nrcFront"
                              | "nrcBack"
                              | "selfie"
                              | "drivingLicenseFront"
                              | "drivingLicenseBack"
                          ]
                        }
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileChange(field.key, f);
                        }}
                        className="hidden"
                      />
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm">
                        <FileImage className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-950">
                        Upload {field.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        Drag & drop or click to browse
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Max size: 5MB (JPG, PNG)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col justify-end gap-3 border-t border-slate-200 pt-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/driver")}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="gap-2 px-8"
            disabled={
              uploading ||
              !nrcFront ||
              !nrcBack ||
              !selfie ||
              !drivingLicenseFront ||
              !drivingLicenseBack
            }
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting Documents...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Submit Verification Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
export default KYCPage;
