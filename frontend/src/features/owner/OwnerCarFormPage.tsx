import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Camera,
  CarFront,
  FileText,
  Loader2,
  Save,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/shared/FileUploader";
import { KYCLock } from "@/components/shared/KYCLock";
import { carsApi } from "@/api";
import { useToast } from "@/providers";
import type { Car } from "@/types";
import { useCachedFetch, invalidateCache } from "@/hooks/useCachedFetch";

type CarPostForm = {
  brand: string;
  model: string;
  year: string;
  color: string;
  license_number: string;
  fuel_type: "petrol" | "diesel" | "electric" | "";
  owner_book: string;
  rental_period: string;
  rental_payment_type: "DAILY" | "WEEKLY" | "MONTHLY" | "";
  rental_type: "DRIVER_HOME" | "OWNER_HOME" | "";
  rental_price: string;
  deposit_amount: string;
};

const initialForm: CarPostForm = {
  brand: "",
  model: "",
  year: "",
  color: "",
  license_number: "",
  fuel_type: "",
  owner_book: "",
  rental_period: "",
  rental_payment_type: "",
  rental_type: "",
  rental_price: "",
  deposit_amount: "0",
};

const imageLabels = [
  { key: "front_image", label: "Front Image" },
  { key: "back_image", label: "Back Image" },
  { key: "left_image", label: "Left Image" },
  { key: "right_image", label: "Right Image" },
] as const;

function RequiredMark() {
  return <span className="text-emerald-600">*</span>;
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Label className="text-xs font-semibold text-slate-700">
      {children} {required && <RequiredMark />}
    </Label>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function readFileData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function OwnerCarFormPage() {
  return (
    <KYCLock feature="Post Car">
      <OwnerCarFormContent />
    </KYCLock>
  );
}

function OwnerCarFormContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: cachedCars } = useCachedFetch<Car[]>("owner-cars", () => carsApi.getOwnerCars());
  const cachedCar = useMemo(
    () => (id ? cachedCars?.find((c) => c.id === id) : undefined),
    [id, cachedCars],
  );

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id && !cachedCar);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState<CarPostForm>(() =>
    cachedCar ? carToForm(cachedCar) : initialForm,
  );
  const [images, setImages] = useState<Record<string, string>>((): Record<string, string> => {
    const imgs = cachedCar?.images;
    if (!imgs) return {};
    return {
      front_image: imgs.front_image,
      back_image: imgs.back_image,
      left_image: imgs.left_image,
      right_image: imgs.right_image,
    };
  });
  const isEditing = !!id;

  useEffect(() => {
    if (!id) return;

    if (cachedCar) {
      if (
        cachedCar.status === "verified" ||
        cachedCar.admin_approval_status === "APPROVED"
      ) {
        addToast("Approved cars cannot be edited", "error");
        navigate("/owner/cars");
      }
      return;
    }

    const loadCar = async () => {
      try {
        const car = await carsApi.getOwnerCar(id);

        if (
          car.status === "verified" ||
          car.admin_approval_status === "APPROVED"
        ) {
          addToast("Approved cars cannot be edited", "error");
          navigate("/owner/cars");
          return;
        }

        setForm(carToForm(car));
        if (car.images) {
          setImages({
            front_image: car.images.front_image,
            back_image: car.images.back_image,
            left_image: car.images.left_image,
            right_image: car.images.right_image,
          });
        }
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        addToast(message || "Failed to load car", "error");
        navigate("/owner/cars");
      } finally {
        setInitialLoading(false);
      }
    };

    loadCar();
  }, [id, cachedCar, navigate, addToast]);

  const setField = (key: keyof CarPostForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleImage = async (key: string, file: File) => {
    try {
      setUploading(key);
      const data = await readFileData(file);
      setImages((current) => ({ ...current, [key]: data }));
    } finally {
      setUploading(null);
    }
  };

  const validate = () => {
    const required: Array<keyof CarPostForm> = [
      "brand",
      "model",
      "license_number",
      "fuel_type",
      "owner_book",
      "rental_payment_type",
      "rental_type",
      "rental_price",
    ];

    if (required.some((key) => !String(form[key]).trim())) {
      addToast("Please fill all required car fields", "error");
      return false;
    }

    if (imageLabels.some((image) => !images[image.key])) {
      addToast("Please upload all four car images", "error");
      return false;
    }

    return true;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        rental_price: Number(form.rental_price),
        deposit_amount: Number(form.deposit_amount || 0),
        ...images,
      };

      if (isEditing && id) {
        await carsApi.update(id, payload);
        addToast("Car updated and sent back for admin approval", "success");
      } else {
        await carsApi.create(payload);
        addToast("Car submitted for admin approval", "success");
      }
      invalidateCache("owner-cars");
      navigate("/owner/cars");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      addToast(message || "Failed to post car", "error");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-muted-foreground">
        Loading car...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Car" : "Post Car"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Add car details, rental terms, and clear vehicle photos for admin
            review.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <BadgeCheck className="h-4 w-4" />
          Required fields are marked with <RequiredMark />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <form onSubmit={onSubmit} className="space-y-8">
          <section className="space-y-4">
            <SectionHeader
              icon={<CarFront className="h-4 w-4" />}
              title="Car Information"
              description="Basic details shown to drivers."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel required>Brand</FieldLabel>
                <Input
                  value={form.brand}
                  onChange={(event) => setField("brand", event.target.value)}
                  placeholder="Toyota"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Model</FieldLabel>
                <Input
                  value={form.model}
                  onChange={(event) => setField("model", event.target.value)}
                  placeholder="Crown"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Year</FieldLabel>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(event) => setField("year", event.target.value)}
                  placeholder="2020"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Color</FieldLabel>
                <Input
                  value={form.color}
                  onChange={(event) => setField("color", event.target.value)}
                  placeholder="White"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>License Number</FieldLabel>
                <Input
                  value={form.license_number}
                  onChange={(event) =>
                    setField("license_number", event.target.value)
                  }
                  placeholder="YGN-1234"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Fuel Type</FieldLabel>
                <Select
                  value={form.fuel_type}
                  onValueChange={(value) => setField("fuel_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="electric">EV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-6">
            <SectionHeader
              icon={<FileText className="h-4 w-4" />}
              title="Ownership"
              description="Reference information used for review."
            />
            <div className="space-y-2">
              <FieldLabel required>Owner Book</FieldLabel>
              <Input
                value={form.owner_book}
                onChange={(event) => setField("owner_book", event.target.value)}
                placeholder="Owner book number or reference"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-6">
            <SectionHeader
              icon={<WalletCards className="h-4 w-4" />}
              title="Rental Terms"
              description="Set pricing and handoff preferences."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel required>Payment Type</FieldLabel>
                <Select
                  value={form.rental_payment_type}
                  onValueChange={(value) =>
                    setField("rental_payment_type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel required>Rental Type</FieldLabel>
                <Select
                  value={form.rental_type}
                  onValueChange={(value) => setField("rental_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rental type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRIVER_HOME">Driver Home</SelectItem>
                    <SelectItem value="OWNER_HOME">Owner Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel>Rental Period</FieldLabel>
                <Input
                  value={form.rental_period}
                  onChange={(event) =>
                    setField("rental_period", event.target.value)
                  }
                  placeholder="e.g. 3 months"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>Rental Price (MMK)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.rental_price}
                  onChange={(event) =>
                    setField("rental_price", event.target.value)
                  }
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Deposit Amount (MMK)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.deposit_amount}
                  onChange={(event) =>
                    setField("deposit_amount", event.target.value)
                  }
                  placeholder="200000"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-6">
            <SectionHeader
              icon={<Camera className="h-4 w-4" />}
              title="Car Photos"
              description="Upload all four sides of the car."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {imageLabels.map((image) => (
                <div key={image.key} className="space-y-2">
                  <FieldLabel required>{image.label}</FieldLabel>
                  <FileUploader
                    label={`${images[image.key] ? "Replace" : "Upload"} ${image.label}`}
                    preview={images[image.key]}
                    onUpload={(file) => handleImage(image.key, file)}
                    uploading={uploading === image.key}
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="sticky bottom-0-mx-4 flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:-mx-6 lg:px-6">
            <p className="text-xs text-muted-foreground">
              Submission goes to admin review before drivers can see the car.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/owner/cars")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? "Submitting..."
                  : isEditing
                    ? "Update Car"
                    : "Submit Car"}
                {!loading && <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function carToForm(car: Car): CarPostForm {
  return {
    brand: car.brand || "",
    model: car.model || "",
    year: car.year ? String(car.year) : "",
    color: car.color || "",
    license_number: car.license_number || car.license_plate || "",
    fuel_type:
      car.fuel_type === "ev"
        ? "electric"
        : (car.fuel_type as CarPostForm["fuel_type"]) || "",
    owner_book: car.owner_book || "",
    rental_period: car.rental_period || "",
    rental_payment_type: car.rental_payment_type || "",
    rental_type: car.rental_type || "",
    rental_price: car.rental_price
      ? String(car.rental_price)
      : String(car.daily_rate || ""),
    deposit_amount: String(car.deposit_amount || 0),
  };
}
