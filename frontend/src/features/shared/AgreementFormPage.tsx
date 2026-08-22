import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Lock } from "lucide-react";
import { domToPng } from "modern-screenshot";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/client";
import { AGREEMENT_LOCKED_MESSAGE } from "@/api/agreements";
import { useAuth } from "@/providers";
import { useToast } from "@/providers";
import { UserRole } from "@/types";

const fieldBase =
  "inline-block max-w-full border-0 border-b border-dotted border-slate-500 bg-transparent px-1 text-center align-baseline outline-none focus:border-slate-900 print:px-0";

type AgreementFields = Record<string, string>;

function Blank({
  width = "w-28",
  value,
  onChange,
  disabled = false,
}: {
  width?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      className={`${fieldBase} ${width} disabled:text-slate-950 disabled:opacity-100`}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <section
      data-agreement-page
      className="mx-auto min-h-0 w-full max-w-[794px] overflow-hidden bg-white px-4 py-6 text-[12px] leading-7 text-slate-950 shadow-sm sm:px-8 sm:py-10 sm:text-[13px] sm:leading-8 lg:min-h-[1120px] lg:px-16 lg:py-16 print:min-h-screen print:max-w-none print:overflow-visible print:px-16 print:py-16 print:text-[13px] print:leading-8 print:shadow-none"
    >
      {children}
    </section>
  );
}

function Clause({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="font-semibold">
        {number}။ {title}
      </p>
      <p className="text-justify">{children}</p>
    </div>
  );
}

export function AgreementFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [signingKey, setSigningKey] = useState<
    "ownerSignature" | "driverSignature" | null
  >(null);
  const [downloading, setDownloading] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [fields, setFields] = useState<AgreementFields>({
    date: "",
    ownerCity: "",
    ownerTownship: "",
    ownerWard: "",
    ownerStreet: "",
    ownerHouseNo: "",
    ownerName: "",
    ownerNrc: "",
    ownerAddress: "",
    ownerPhone: "",
    driverCity: "",
    driverTownship: "",
    driverWard: "",
    driverStreet: "",
    driverHouseNo: "",
    driverName: "",
    driverNrc: "",
    driverAddress: "",
    driverPhone: "",
    contractYear: "",
    contractMonth: "",
    contractDay: "",
    carType: "",
    licenseNumber: "",
    carColor: "",
    rentalMonths: "",
    financialPeriod: "",
    commissionAmount: "",
    totalAmount: "",
    noticeMonths: "",
    ownerSignature: "",
    driverSignature: "",
    companySignature: "",
    companySigner: "",
    companyRole: "",
    companyDate: "",
  });

  const setField = (key: string, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const role = user?.role?.toUpperCase();

  const canEditField = (key: string) => {
    if (key.startsWith("owner")) {
      return role === UserRole.Owner && !fields.ownerSignature;
    }

    if (key.startsWith("driver")) {
      return role === UserRole.Driver && !fields.driverSignature;
    }

    return role === UserRole.Admin;
  };

  const blank = (key: string, width = "w-28") => (
    <Blank
      width={width}
      value={fields[key] || ""}
      disabled={!canEditField(key)}
      onChange={(value) => setField(key, value)}
    />
  );

  const signatureText = (name: string, agreedAt?: string | null) => {
    if (!agreedAt) return "";
    return `${name || "Agreed"} (${new Date(agreedAt).toLocaleDateString()})`;
  };

  const signAgreement = async (
    signatureKey: "ownerSignature" | "driverSignature",
    nameKey: "ownerName" | "driverName",
  ) => {
    if (!id) return;

    const signedName = fields[nameKey] || user?.name || "Agreed";
    try {
      setSigningKey(signatureKey);
      const res = await apiClient.post(`/agreements/${id}/agree`);
      const status = res.data.data || {};

      setFields((current) => ({
        ...current,
        ownerSignature:
          signatureText(current.ownerName, status.owner_agreement_agreed_at) ||
          current.ownerSignature,
        driverSignature:
          signatureText(
            current.driverName,
            status.driver_agreement_agreed_at,
          ) || current.driverSignature,
        [signatureKey]:
          signatureText(
            signedName,
            signatureKey === "ownerSignature"
              ? status.owner_agreement_agreed_at
              : status.driver_agreement_agreed_at,
          ) || `${signedName} (${new Date().toLocaleDateString()})`,
      }));
    } finally {
      setSigningKey(null);
    }
  };

  const downloadPdf = async () => {
    const pageNodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-agreement-page]"),
    );
    if (!pageNodes.length || downloading) return;

    try {
      setDownloading(true);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = 210;
      const pageHeight = 297;

      for (let index = 0; index < pageNodes.length; index++) {
        const node = pageNodes[index];
        const dataUrl = await domToPng(node, {
          scale: 2,
          backgroundColor: "#ffffff",
        });

        if (index > 0) pdf.addPage();

        const ratio = node.offsetHeight / node.offsetWidth;
        let imageWidth = pageWidth;
        let imageHeight = pageWidth * ratio;
        if (imageHeight > pageHeight) {
          imageHeight = pageHeight;
          imageWidth = pageHeight / ratio;
        }
        pdf.addImage(
          dataUrl,
          "PNG",
          (pageWidth - imageWidth) / 2,
          (pageHeight - imageHeight) / 2,
          imageWidth,
          imageHeight,
        );
      }

      pdf.save(`agreement-${id || "form"}.pdf`);
    } catch (error) {
      console.error("Download agreement PDF error:", error);
      addToast("Failed to generate PDF", "error");
    } finally {
      setDownloading(false);
    }
  };

  const agreementButton = (
    signatureKey: "ownerSignature" | "driverSignature",
    nameKey: "ownerName" | "driverName",
    allowedRole: string,
  ) => {
    const signedValue = fields[signatureKey];
    const canSign = user?.role?.toUpperCase() === allowedRole;
    const actionLabel = signatureKey === "driverSignature" ? "Agreed" : "Agree";
    const isSigning = signingKey === signatureKey;

    return (
      <span className="inline-flex min-h-10 items-center align-middle">
        <span className="hidden print:inline">
          {signedValue || "________________"}
        </span>
        <Button
          type="button"
          size="sm"
          className="print:hidden"
          disabled={!canSign || !!signedValue || isSigning}
          onClick={() => signAgreement(signatureKey, nameKey)}
        >
          {isSigning ? "Saving..." : signedValue ? "Agreed" : actionLabel}
        </Button>
      </span>
    );
  };

  useEffect(() => {
    const loadAgreement = async () => {
      if (!id) return;

      try {
        const res = await apiClient.get(`/agreements/${id}`);
        const agreement = res.data.data;
        const createdAt = agreement.created_at
          ? new Date(agreement.created_at)
          : new Date();
        const ownerProfile = agreement.owner_profile || {};
        const driverProfile = agreement.driver_profile || {};
        const car = agreement.car || {};
        const totalAmount = Number(
          agreement.total_amount || car.rental_price || car.daily_rate || 0,
        );
        const commissionAmount = totalAmount ? totalAmount * 0.02 : 0;

        setFields((current) => ({
          ...current,
          date: createdAt.toLocaleDateString(),
          ownerCity: ownerProfile.city || "",
          ownerTownship: ownerProfile.township || "",
          ownerWard: "",
          ownerStreet: "",
          ownerHouseNo: "",
          ownerName: agreement.owner?.name || "",
          ownerNrc: ownerProfile.nrc_number || "",
          ownerAddress: ownerProfile.address || "",
          ownerPhone: ownerProfile.phone || agreement.owner?.phone || "",
          driverCity: driverProfile.city || "",
          driverTownship: driverProfile.township || "",
          driverWard: "",
          driverStreet: "",
          driverHouseNo: "",
          driverName: agreement.driver?.name || "",
          driverNrc: driverProfile.nrc_number || "",
          driverAddress: driverProfile.address || "",
          driverPhone: driverProfile.phone || agreement.driver?.phone || "",
          contractYear: String(createdAt.getFullYear()),
          contractMonth: String(createdAt.getMonth() + 1),
          contractDay: String(createdAt.getDate()),
          carType: [car.brand, car.model].filter(Boolean).join(" "),
          licenseNumber: car.license_number || car.license_plate || "",
          carColor: car.color || "",
          rentalMonths: car.rental_period || "",
          financialPeriod: car.rental_payment_type || "",
          commissionAmount: commissionAmount ? String(commissionAmount) : "",
          totalAmount: totalAmount ? String(totalAmount) : "",
          ownerSignature:
            signatureText(
              agreement.owner?.name || "",
              agreement.owner_agreement_agreed_at,
            ) || current.ownerSignature,
          driverSignature:
            signatureText(
              agreement.driver?.name || "",
              agreement.driver_agreement_agreed_at,
            ) || current.driverSignature,
          companySignature: current.companySignature,
          companySigner: current.companySigner,
          companyRole: current.companyRole,
          companyDate: current.companyDate,
        }));
      } catch (error) {
        const response = (
          error as { response?: { status?: number; data?: { code?: string; error?: string } } }
        )?.response;
        if (response?.status === 403 && response.data?.code === "AGREEMENT_LOCKED") {
          setLockMessage(response.data.error || AGREEMENT_LOCKED_MESSAGE);
        }
        // Otherwise keep the form editable even if the agreement data cannot be loaded.
      }
    };

    loadAgreement();
  }, [id]);

  if (lockMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-200 px-4 print:hidden">
        <div className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Lock className="h-6 w-6 text-amber-600" />
          </span>
          <h1 className="text-lg font-bold text-slate-950">Agreement Locked</h1>
          <p className="mt-2 text-sm text-slate-600">{lockMessage}</p>
          <p className="mt-4 text-xs text-slate-400">
            Once the commission payment is verified by admin, this agreement will unlock automatically.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 px-3 py-4 sm:px-4 sm:py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto mb-4 flex max-w-[794px] items-center justify-end print:hidden">
        <Button onClick={() => void downloadPdf()} disabled={downloading}>
          <Download className="h-4 w-4" />
          {downloading ? "Downloading..." : "Download PDF"}
        </Button>
      </div>

      <div className="space-y-6 print:space-y-0">
        <Page>
          <div className="mx-auto w-full max-w-[660px] border-y border-yellow-500 bg-red-50/70 px-2 py-2.5 text-center leading-6">
            <p className="text-[13px] font-bold text-red-800">
              TAXI MEIK SWE CAR RENTAL MARKETPLACE PLATFORM
            </p>
            <p className="text-[15px] font-bold text-red-800 sm:text-[17px]">
              သုံးဦးသဘောတူ အငှားယာဉ်ငှားရမ်းခြင်း ကတိစာချုပ်
            </p>
            <p className="text-[13px] font-semibold text-slate-600">
              ယာဉ်ပိုင်ရှင် &nbsp;&nbsp; • &nbsp;&nbsp; ယာဉ်မောင်း &nbsp;&nbsp;
              • &nbsp;&nbsp; Taxi Meik Swe အကျိုးဆောင်ကုမ္ပဏီ
            </p>
          </div>

          <div className="mt-10 text-center sm:mt-16">
            <p className="text-[17px] font-bold sm:text-[20px]">
              “သုံးဦးသဘောတူ မော်တော်ယာဉ်ငှားရမ်းခြင်း ကတိစာချုပ်”
            </p>
            <p className="mt-8 text-right text-[14px] sm:mt-10 sm:text-[15px]">
              ရက်စွဲ {blank("date", "w-64")}
            </p>
          </div>

          <div className="mt-8 space-y-4 text-[14px] leading-8 sm:text-[15px] sm:leading-9">
            <p className="font-bold">စာချုပ်တွင် ပါဝင်ချုပ်ဆိုသူများ -</p>
            <p>
              (၁) ယာဉ်ပိုင်ရှင်- {blank("ownerCity", "w-48")} မြို့၊{" "}
              {blank("ownerTownship", "w-40")} မြို့နယ်၊ နေ ဦး/ဒေါ်{" "}
              {blank("ownerName", "w-52")}
              (မှတ်ပုံတင်အမှတ် {blank("ownerNrc", "w-56")})။
            </p>
            <p>
              (၂) ယာဉ်မောင်း(ငှားရမ်းသူ)- {blank("driverCity", "w-44")}၊ မြို့၊{" "}
              {blank("driverTownship", "w-40")} မြို့နယ်၊ နေ ဦး/ဒေါ်
              {blank("driverName", "w-52")} (မှတ်ပုံတင်အမှတ်{" "}
              {blank("driverNrc", "w-56")})။
            </p>
            <p>
              (၃) <span className="font-bold">အကျိုးဆောင်ကုမ္ပဏီ-</span> Taxi
              Meik Swe (ကားအငှား ဝန်ဆောင်မှု) အကျိုးဆောင်ကုမ္ပဏီ။
            </p>
            <p>
              အထက်ဖော်ပြပါ ယာဉ်ပိုင်ရှင်၊ ယာဉ်မောင်း နှင့် အကျိုးဆောင်ကုမ္ပဏီ
              တို့သည် {blank("contractYear", "w-28")} ခုနှစ်၊
              {blank("contractMonth", "w-28")} လ၊ (
              {blank("contractDay", "w-24")}) ရက်နေ့တွင်
              ဤသဘောတူညီရန်ငှားရမ်းခြင်း ကတိစာချုပ်ကို သုံးဦးသဘောတူညီချက်အရ
              လက်မှတ်ရေးထိုးချုပ်ဆိုကြသည်။
            </p>
            <p>
              ငှားရမ်းသည့် မော်တော်ယာဉ် (တက္ကစီ) အမျိုးအစား{" "}
              {blank("carType", "w-72")}
              မြို့ရှိ မော်တော်ယာဉ်အမှတ် {blank("licenseNumber", "w-56")}။
              အရောင် {blank("carColor", "w-44")}
              ဖြစ်ပါသည်။ အထက်ဖော်ပြပါ မော်တော်ယာဉ်ကို (
              {blank("rentalMonths", "w-28")}) လ တိတိ ငှားရမ်းရန် အပြန်အလှန်
              သဘောတူညီပါသည်။
            </p>
          </div>

          <div className="mt-10 space-y-4 text-[14px] leading-8 sm:text-[15px] sm:leading-9">
            <p className="font-bold text-red-800">
              လုပ်ငန်းစဉ်များ၊ စည်းကမ်းချက်များနှင့် ငွေကြေးဆိုင်ရာ
              သတ်မှတ်ချက်များ
            </p>
            <p className="text-justify">
              <span className="font-bold">
                ၁။ စပေါ်ငွေနှင့် ကားငှားခ ငွေပေးချေခြင်းလုပ်ငန်းစဉ် (Financial
                Flow Process)-
              </span>
              ယာဉ်မောင်းသည် စာချုပ်ချုပ်ဆိုသည့်နေ့တွင် စပေါ်ငွေ၊ စာချုပ်စရိတ်၊
              ငှားရမ်းသော ကာလ
              {blank("financialPeriod", "w-48")} နှင့် အကျိုးဆောင်ကုမ္ပဏီတို့ကို
              ပေးချေရမည်။ အကျိုးဆောင်ကုမ္ပဏီ (စပေါ်ငွေ၏ ၂%) ဖြစ်သော ကျပ်
            </p>
          </div>
        </Page>

        <Page>
          <div className="space-y-5 pt-2 text-[14px] leading-8 sm:text-[15px] sm:leading-9">
            <p className="text-justify">
              {blank("commissionAmount", "w-48")} (စုစုပေါင်း ကျပ်{" "}
              {blank("totalAmount", "w-52")}) အားလုံးကို
              အကျိုးဆောင်ကုမ္ပဏီထံသို့ ဦးစွာ ပေးပို့ရမည်။ ခွဲခြမ်းပေးပို့ရန်မည်
              ဖြစ်သည်။
            </p>

            <p className="text-justify">
              <span className="font-bold">
                ၂။ အကျိုးဆောင်ကုမ္ပဏီမှ ယာဉ်ပိုင်ရှင်ထံ
                ပြန်လည်ပေးခြင်း/ပေးချေခြင်း-
              </span>
              ယာဉ်မောင်းထံမှ စပေါ်ငွေနှင့် ကားငှားခငွေများ လက်ခံပြီးနောက်၊
              အကျိုးဆောင်ကုမ္ပဏီသည် မိမိ၏ ဝန်ဆောင်ခကော်မရှင် (၂%) ကို
              နှုတ်ယူထားပြီး၊ ကျန်ရှိသော စပေါ်ငွေ အပြည့်အဝကို
              ယာဉ်ပိုင်ရှင်ထံသို့ သတ်မှတ်ထားသော လုပ်ငန်းစဉ်အတိုင်း
              ပြန်လည်ပေးပို့ခြင်း/ပေးချေခြင်း ဆောင်ရွက်မည် ဖြစ်သည်။
            </p>

            <p className="text-justify">
              <span className="font-bold">
                ၃။ ကော်မရှင် ပြန်မအမ်းနိုင်မှု (Non-Refundable Commission)-
              </span>
              ယာဉ်မောင်းမှ အကျိုးဆောင်ကုမ္ပဏီထံ ပေးချေခဲ့သော စပေါ်ငွေ၏ ၂%
              အကျိုးဆောင်ကော်မရှင်သည် ယာဉ်ပိုင်ရှင်နှင့် ချိတ်ဆက်ပေးခြင်း၊
              ငှားရမ်းရေးအတွက် ပြုလုပ်ခြင်း၊ စာရွက်စာတမ်းအကြောင်းကြားခြင်း၊
              ပြင်ဆင်ပေးတိုင်ပင်ခြင်း စသည့် ဝန်ဆောင်မှုအတွက် ဖြစ်သောကြောင့်
              ပြန်လည်အမ်းမည် မဟုတ်ပါ။
            </p>

            <p className="text-justify">
              <span className="font-bold">
                ၄။ စပေါ်ငွေ ပြန်လည်အမ်းနှင်း (Deposit Refund Rule)-
              </span>
              ယာဉ်မောင်းက ကတိစာချုပ်ပါ စည်းကမ်းချက်များကို ကောင်းမွန်စွာလိုက်နာ၊
              သတ်မှတ်ကာလပြည့်မြောက်၍ ယာဉ်ကို ပြန်လည်အပ်နှံသည့်အခါ
              အကျိုးဆောင်ကုမ္ပဏီက ထိန်းထားခဲ့သော စပေါ်ငွေ အပြည့်အဝကို
              ယာဉ်ပိုင်ရှင်ထံ ယာဉ်ပြန်လည်အပ်နှံပြီးနောက် တာဝန်ရှိသူ၏
              စစ်ဆေးပြီးဆုံးမှုကို အတည်ပြုသည့်အခါ ကော်မရှင် ၂%
              ကောက်ခံပြီးသောကြောင့် ပြန်လည်ပေးပို့ရန် ယာဉ်ပိုင်ရှင်တွင်
              တာဝန်ရှိစေရမည်။
            </p>

            <p className="text-justify">
              <span className="font-bold">
                ၅။ ကြိုတင်အကြောင်းကြားရန် သတ်မှတ်ချက်-
              </span>
              ယာဉ်ပိုင်ရှင်ဘက်မှဖြစ်စေ၊ ယာဉ်မောင်းဘက်မှဖြစ်စေ၊
              ယာဉ်ငှားရမ်းခြင်းကို ရပ်ဆိုင်းလိုပါက (
              {blank("noticeMonths", "w-28")}) လ ကြိုတင်၍ အခြားတစ်ဖက်သို့
              အကြောင်းကြားရန် သဘောတူညီကြသည်။
            </p>

            <p className="text-justify">
              <span className="font-bold">၆။ နစ်နာကြေးနှင့် စည်းကမ်းချက်-</span>
              နှစ်ဖက်တစ်ဦးဦးက လက်ရှိသတ်မှတ်ချက်များကို မလိုက်နာပါက
              ယာဉ်ပိုင်ရှင်မှ စပေါ်ငွေ အားလုံးဖြတ်သိမ်းခံရမည်။
            </p>

            <p className="text-justify">
              <span className="font-bold">
                ၇။ ပစ္စည်းအကြောင်းအရာ တင်ပြချက်-
              </span>
              ပစ္စည်းအလွန်အကျွံနွမ်းသော၊ စက်ပစ္စည်းပျက်စီးမှုများ၊ တာဝန်ခံရမည့်
              အခြေအနေများ ဖြစ်ပေါ်လာပါက ပြင်ဆင်ကုန်ကျစရိတ်များကို မောင်းနှင်သူမှ
              တာဝန်ယူဆောင်ရွက်ရမည်။ ယာဉ်ပိုင်ရှင်နှင့် Taxi Meik Swe (ကားအငှား
              ဝန်ဆောင်မှု) အကျိုးဆောင်ကုမ္ပဏီတို့သည် ယာဉ်ပိုင်ရှင်၊
              ယာဉ်မောင်းတို့၏ သဘောတူညီချက်ဖြင့် လုပ်ငန်းဆောင်ရွက်မည်။
            </p>

            <p className="text-justify">
              <span className="font-bold">
                ၈။ အခြားသော ပေးဆောင်ရန် သတ်မှတ်ချက်-
              </span>
              ယာဉ်မောင်းသည် သတ်မှတ်ထားသော ယာဉ်ငှားရမ်းခကို ယာဉ်ပိုင်ရှင်ထံ
              တိုက်ရိုက် ပေးဆောင်ရမည်။
            </p>
          </div>
        </Page>

        <Page>
          <div className="mt-10 space-y-12 text-[14px] leading-8 sm:mt-16 sm:space-y-16 sm:text-[15px] sm:leading-9 lg:mt-20 lg:space-y-24">
            <p className="mx-auto max-w-[610px] text-justify">
              အထက်ဖော်ပြပါ အချက်အလက်များကို ယာဉ်ပိုင်ရှင်၊ ယာဉ်မောင်း နှင့်
              အကျိုးဆောင်ကုမ္ပဏီတို့သည် သေချာစွာ ဖတ်ရှုနားလည်ပြီး မိမိတို့၏
              အခွင့်အရေးများဖြင့် သဘောတူညီ၍ ဤသုံးဦးသဘောတူ ကတိစာချုပ်ကို
              လက်မှတ်ရေးထိုး ချုပ်ဆိုကြောင်း ဖြစ်ပါသည်။
            </p>

            <div className="grid grid-cols-1 gap-8 text-[14px] leading-9 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12 lg:leading-10 print:grid-cols-3 print:gap-12">
              <div>
                <p className="font-bold">ယာဉ်ပိုင်ရှင်</p>
                <p className="font-bold leading-5">(Vehicle Owner)</p>
                <div className="mt-5 space-y-2">
                  <p>
                    လက်မှတ်:{" "}
                    {agreementButton(
                      "ownerSignature",
                      "ownerName",
                      UserRole.Owner,
                    )}
                  </p>
                  <p>အမည်: {blank("ownerName", "w-36")}</p>
                  <p>မှတ်ပုံတင်: {blank("ownerNrc", "w-38")}</p>
                  <p>ဖုန်းနံပါတ်: {blank("ownerPhone", "w-32")}</p>
                </div>
              </div>
              <div>
                <p className="font-bold">ယာဉ်မောင်း</p>
                <p className="font-bold leading-5">(Taxi Driver)</p>
                <div className="mt-5 space-y-2">
                  <p>
                    လက်မှတ်:{" "}
                    {agreementButton(
                      "driverSignature",
                      "driverName",
                      UserRole.Driver,
                    )}
                  </p>
                  <p>အမည်: {blank("driverName", "w-36")}</p>
                  <p>မှတ်ပုံတင်: {blank("driverNrc", "w-38")}</p>
                  <p>ဖုန်းနံပါတ်: {blank("driverPhone", "w-32")}</p>
                </div>
              </div>
              <div>
                <p className="font-bold">အကျိုးဆောင်ကုမ္ပဏီ</p>
                <p className="font-bold leading-5">(Taxi Meik Swe Company)</p>
                <div className="mt-5 space-y-2">
                  <p>လက်မှတ်: {blank("companySignature", "w-32")}</p>
                  <p>အမည်: {blank("companySigner", "w-36")}</p>
                  <p>ရာထူး/ဌာန: {blank("companyRole", "w-28")}</p>
                  <p>နေ့စွဲ: {blank("companyDate", "w-36")}</p>
                </div>
              </div>
            </div>
          </div>
        </Page>
      </div>
    </div>
  );
}
