"use client";

import { useState } from "react";

type Visit = {
  id: string;
  visitDate: string;
  visitType: string;
  diagnosis: string | null;
  prescription: string | null;
  nextVisitDate: string | null;
};

type ProfileData = {
  name: string;
  phone: string;
  profile: {
    dateOfBirth: string | null;
    bloodType: string | null;
    chronicConditions: string | null;
    allergies: string | null;
    isPregnant: boolean;
    lastPeriodDate: string | null;
    privacyMode: boolean;
    visits?: Visit[];
  } | null;
};

const visitTypeLabels: Record<string, string> = {
  CHECKUP: "كشف عادي",
  ANTENATAL_FOLLOWUP: "متابعة حمل",
  ULTRASOUND: "سونار",
  EMERGENCY: "حالة طارئة",
  DELIVERY: "ولادة",
  POSTNATAL: "متابعة بعد الولادة",
};

export default function ProfilePage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [data, setData] = useState<ProfileData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [bloodType, setBloodType] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [isPregnant, setIsPregnant] = useState(false);
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [privacyMode, setPrivacyMode] = useState(false);

  async function lookup() {
    if (!phone.trim()) return;
    setLoading(true);
    setNotFound(false);
    setSaved(false);
    try {
      const res = await fetch(`/api/profile?phone=${encodeURIComponent(phone)}`);
      if (res.status === 404) {
        setNotFound(true);
        setData(null);
        return;
      }
      const json: ProfileData = await res.json();
      setData(json);
      setName(json.name);
      setBloodType(json.profile?.bloodType || "");
      setChronicConditions(json.profile?.chronicConditions || "");
      setAllergies(json.profile?.allergies || "");
      setIsPregnant(json.profile?.isPregnant || false);
      setLastPeriodDate(json.profile?.lastPeriodDate?.slice(0, 10) || "");
      setPrivacyMode(json.profile?.privacyMode || false);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name,
          bloodType,
          chronicConditions,
          allergies,
          isPregnant,
          lastPeriodDate: lastPeriodDate || undefined,
          privacyMode,
        }),
      });
      const json = await res.json();
      setData((prev) => ({ ...json, profile: { ...json.profile, visits: prev?.profile?.visits } }));
      setNotFound(false);
      setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-blush-50 p-6 font-body">
      <div className="mx-auto max-w-lg pt-8">
        <div className="mb-6 text-center">
          <div className="queue-badge mx-auto mb-4 h-14 w-14 text-xl font-display font-semibold">
            ♀
          </div>
          <h1 className="font-display text-2xl font-semibold text-wine-700">ملفك الطبي</h1>
          <p className="mt-1 text-sm text-plum-900/60">بديل الكرت الورقي — بياناتك محفوظة دائمًا</p>
          <div className="arc-divider mx-auto mt-3" />
        </div>

        <div className="mb-4 flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            className="flex-1 rounded-xl border border-rose-400/30 bg-white p-2 text-right focus:border-wine-500 focus:outline-none"
            placeholder="ادخلي رقم هاتفك"
          />
          <button
            onClick={lookup}
            disabled={loading}
            className="rounded-xl bg-wine-600 px-5 py-2 text-white transition hover:bg-wine-700 disabled:opacity-50"
          >
            بحث
          </button>
        </div>

        {notFound && (
          <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-plum-900">
            مفيش ملف مسجل بالرقم ده. تقدري تسجلي بياناتك أول مرة في الفورم تحت.
          </div>
        )}

        {(data || notFound) && (
          <div className="rounded-2xl border border-rose-400/20 bg-white p-6 shadow-soft">
            <label className="mb-1 block text-sm text-plum-900/70">الاسم</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-4 w-full rounded-xl border border-rose-400/30 p-2 focus:border-wine-500 focus:outline-none"
            />

            <label className="mb-1 block text-sm text-plum-900/70">فصيلة الدم</label>
            <input
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              className="mb-4 w-full rounded-xl border border-rose-400/30 p-2 focus:border-wine-500 focus:outline-none"
              placeholder="مثال: O+"
            />

            <label className="mb-1 block text-sm text-plum-900/70">أمراض مزمنة</label>
            <textarea
              value={chronicConditions}
              onChange={(e) => setChronicConditions(e.target.value)}
              className="mb-4 w-full rounded-xl border border-rose-400/30 p-2 focus:border-wine-500 focus:outline-none"
              rows={2}
              placeholder="مثال: ضغط، سكر..."
            />

            <label className="mb-1 block text-sm text-plum-900/70">حساسية من أدوية</label>
            <textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="mb-4 w-full rounded-xl border border-rose-400/30 p-2 focus:border-wine-500 focus:outline-none"
              rows={2}
            />

            <label className="mb-3 flex items-center gap-2 text-sm text-plum-900/80">
              <input
                type="checkbox"
                checked={isPregnant}
                onChange={(e) => setIsPregnant(e.target.checked)}
                className="h-4 w-4"
              />
              حامل حاليًا
            </label>

            {isPregnant && (
              <div className="mb-4">
                <label className="mb-1 block text-sm text-plum-900/70">
                  تاريخ آخر دورة شهرية (LMP)
                </label>
                <input
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  className="w-full rounded-xl border border-rose-400/30 p-2 focus:border-wine-500 focus:outline-none"
                />
              </div>
            )}

            <label className="mb-5 flex items-center gap-2 text-sm text-plum-900/80">
              <input
                type="checkbox"
                checked={privacyMode}
                onChange={(e) => setPrivacyMode(e.target.checked)}
                className="h-4 w-4"
              />
              إخفاء اسمي في شاشة الانتظار العامة (يظهر رقم الدور فقط)
            </label>

            <button
              onClick={save}
              disabled={loading}
              className="w-full rounded-full bg-sage-500 px-6 py-3 font-medium text-white transition hover:bg-sage-400 disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "حفظ البيانات"}
            </button>

            {saved && <p className="mt-3 text-center text-sm text-sage-500">تم الحفظ بنجاح ✓</p>}
          </div>
        )}

        {data?.profile?.visits && data.profile.visits.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-wine-600">
              سجل الزيارات السابقة
            </h2>
            <div className="space-y-3">
              {data.profile.visits.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-rose-400/15 bg-white p-4 shadow-soft"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-wine-600">
                      {visitTypeLabels[v.visitType] || v.visitType}
                    </span>
                    <span className="text-xs text-plum-900/50">
                      {new Date(v.visitDate).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                  {v.diagnosis && <p className="text-sm text-plum-900/70">التشخيص: {v.diagnosis}</p>}
                  {v.prescription && (
                    <p className="text-sm text-plum-900/70">الروشتة: {v.prescription}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
