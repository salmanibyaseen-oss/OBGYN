"use client";

import { useEffect, useState } from "react";
import ClinicMark from "@/components/ClinicMark";

type Appointment = {
  id: string;
  queueNumber: number;
  status: string;
  patient: { name: string };
};

type Visit = {
  id: string;
  visitDate: string;
  visitType: string;
  diagnosis: string | null;
  prescription: string | null;
  doctorNotes: string | null;
};

type PatientDetail = {
  id: string;
  queueNumber: number;
  patient: { name: string; phone: string };
  isFirstVisit: boolean;
  profile: {
    dateOfBirth: string | null;
    bloodType: string | null;
    chronicConditions: string | null;
    allergies: string | null;
    isPregnant: boolean;
    lastPeriodDate: string | null;
  } | null;
  visits: Visit[];
};

const visitTypeLabels: Record<string, string> = {
  CHECKUP: "كشف عادي",
  ANTENATAL_FOLLOWUP: "متابعة حمل",
  ULTRASOUND: "سونار",
  EMERGENCY: "حالة طارئة",
  DELIVERY: "ولادة",
  POSTNATAL: "متابعة بعد الولادة",
};

export default function DoctorPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");

  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // فورم بيانات الكارت لو دي أول زيارة للمريضة
  const [cardDateOfBirth, setCardDateOfBirth] = useState("");
  const [cardBloodType, setCardBloodType] = useState("");
  const [cardChronic, setCardChronic] = useState("");
  const [cardAllergies, setCardAllergies] = useState("");
  const [cardIsPregnant, setCardIsPregnant] = useState(false);
  const [cardLastPeriod, setCardLastPeriod] = useState("");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);

  async function fetchAppointments() {
    const today = new Date().toISOString();
    const res = await fetch(`/api/appointments?date=${today}`);
    setAppointments(await res.json());
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  const waiting = appointments.filter((a) => a.status === "WAITING");
  const current = appointments.find((a) => a.id === activeId);

  async function fetchDetail(id: string) {
    setDetailLoading(true);
    setCardSaved(false);
    try {
      const res = await fetch(`/api/appointments/${id}`);
      const json: PatientDetail = await res.json();
      setDetail(json);
      setCardDateOfBirth(json.profile?.dateOfBirth?.slice(0, 10) || "");
      setCardBloodType(json.profile?.bloodType || "");
      setCardChronic(json.profile?.chronicConditions || "");
      setCardAllergies(json.profile?.allergies || "");
      setCardIsPregnant(json.profile?.isPregnant || false);
      setCardLastPeriod(json.profile?.lastPeriodDate?.slice(0, 10) || "");
    } finally {
      setDetailLoading(false);
    }
  }

  async function callNext() {
    const next = waiting[0];
    if (!next) return;
    await fetch(`/api/appointments/${next.id}/call`, { method: "PATCH" });
    setActiveId(next.id);
    await fetchAppointments();
    await fetchDetail(next.id);
  }

  async function saveCardData() {
    if (!detail) return;
    setCardSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: detail.patient.phone,
          dateOfBirth: cardDateOfBirth || undefined,
          bloodType: cardBloodType,
          chronicConditions: cardChronic,
          allergies: cardAllergies,
          isPregnant: cardIsPregnant,
          lastPeriodDate: cardLastPeriod || undefined,
        }),
      });
      setCardSaved(true);
    } finally {
      setCardSaving(false);
    }
  }

  async function completeVisit() {
    if (!activeId) return;
    await fetch(`/api/appointments/${activeId}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, prescription, visitType: "CHECKUP" }),
    });
    setActiveId(null);
    setDetail(null);
    setDiagnosis("");
    setPrescription("");
    await fetchAppointments();
  }

  const lastVisit = detail?.visits[0];

  return (
    <main dir="rtl" className="min-h-screen bg-blush-50 p-6 font-body">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="queue-badge h-10 w-10 flex-shrink-0 text-base font-display">
            <ClinicMark />
          </div>
          <h1 className="font-display text-2xl font-semibold text-wine-700">لوحة الدكتور</h1>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="rounded-full border border-rose-400/30 px-4 py-1.5 text-sm text-plum-900/60 transition hover:bg-blush-100"
        >
          تسجيل خروج
        </button>
      </div>
      <div className="arc-divider mb-6" />

      {!current && (
        <button
          onClick={callNext}
          disabled={waiting.length === 0}
          className="mb-6 rounded-full bg-wine-600 px-6 py-3 font-medium text-white shadow-soft transition hover:bg-wine-700 disabled:opacity-40"
        >
          نداء المريضة التالية ({waiting.length} في الانتظار)
        </button>
      )}

      {current && (
        <div className="rounded-[1.75rem] border border-rose-400/20 bg-white p-6 shadow-soft">
          <h2 className="mb-4 font-display text-lg font-semibold text-wine-700">
            جاري كشف: {current.patient.name} (دور رقم {current.queueNumber})
          </h2>

          {detailLoading && <p className="mb-4 text-sm text-plum-900/50">جاري تحميل بيانات الحالة...</p>}

          {/* أول زيارة: فورم بيانات الكارت */}
          {detail?.isFirstVisit && (
            <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="mb-3 text-sm font-medium text-plum-900">
                أول زيارة للمريضة دي — من فضلك سجّل بيانات الكارت
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-plum-900/70">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={cardDateOfBirth}
                    onChange={(e) => setCardDateOfBirth(e.target.value)}
                    className="w-full rounded-lg border border-rose-400/30 p-2 text-sm focus:border-wine-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-plum-900/70">فصيلة الدم</label>
                  <input
                    value={cardBloodType}
                    onChange={(e) => setCardBloodType(e.target.value)}
                    placeholder="مثال: O+"
                    className="w-full rounded-lg border border-rose-400/30 p-2 text-sm focus:border-wine-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-plum-900/70">أمراض مزمنة</label>
                  <input
                    value={cardChronic}
                    onChange={(e) => setCardChronic(e.target.value)}
                    className="w-full rounded-lg border border-rose-400/30 p-2 text-sm focus:border-wine-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-plum-900/70">حساسية من أدوية</label>
                  <input
                    value={cardAllergies}
                    onChange={(e) => setCardAllergies(e.target.value)}
                    className="w-full rounded-lg border border-rose-400/30 p-2 text-sm focus:border-wine-500 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-plum-900/80">
                  <input
                    type="checkbox"
                    checked={cardIsPregnant}
                    onChange={(e) => setCardIsPregnant(e.target.checked)}
                    className="h-4 w-4"
                  />
                  حامل حاليًا
                </label>
                {cardIsPregnant && (
                  <div>
                    <label className="mb-1 block text-xs text-plum-900/70">تاريخ آخر دورة (LMP)</label>
                    <input
                      type="date"
                      value={cardLastPeriod}
                      onChange={(e) => setCardLastPeriod(e.target.value)}
                      className="w-full rounded-lg border border-rose-400/30 p-2 text-sm focus:border-wine-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={saveCardData}
                disabled={cardSaving}
                className="mt-3 rounded-full bg-sage-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-sage-400 disabled:opacity-50"
              >
                {cardSaving ? "جاري الحفظ..." : "حفظ بيانات الكارت"}
              </button>
              {cardSaved && <span className="mr-3 text-sm text-sage-500">تم الحفظ ✓</span>}
            </div>
          )}

          {/* حالة متابعة: التاريخ المرضي + آخر روشتة */}
          {detail && !detail.isFirstVisit && (
            <div className="mb-5 space-y-4">
              {lastVisit && (
                <div className="rounded-2xl border border-wine-600/20 bg-blush-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-wine-700">
                    آخر روشتة (بتاريخ {new Date(lastVisit.visitDate).toLocaleDateString("ar-EG")})
                  </p>
                  <p className="text-sm text-plum-900/80">
                    {lastVisit.prescription || "مفيش روشتة مسجلة في آخر زيارة"}
                  </p>
                  {lastVisit.diagnosis && (
                    <p className="mt-1 text-xs text-plum-900/50">التشخيص وقتها: {lastVisit.diagnosis}</p>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold text-wine-600">التاريخ المرضي</p>
                {detail.profile && (
                  <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-rose-400/15 bg-white p-3 text-xs text-plum-900/70 sm:grid-cols-4">
                    <span>فصيلة الدم: {detail.profile.bloodType || "-"}</span>
                    <span>أمراض مزمنة: {detail.profile.chronicConditions || "-"}</span>
                    <span>حساسية: {detail.profile.allergies || "-"}</span>
                    <span>حامل: {detail.profile.isPregnant ? "نعم" : "لا"}</span>
                  </div>
                )}
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {detail.visits.map((v) => (
                    <div key={v.id} className="rounded-xl border border-rose-400/10 bg-white p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-wine-600">
                          {visitTypeLabels[v.visitType] || v.visitType}
                        </span>
                        <span className="text-xs text-plum-900/50">
                          {new Date(v.visitDate).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                      {v.diagnosis && <p className="text-xs text-plum-900/70">التشخيص: {v.diagnosis}</p>}
                      {v.prescription && (
                        <p className="text-xs text-plum-900/70">الروشتة: {v.prescription}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <label className="mb-1 block text-sm text-plum-900/70">التشخيص</label>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className="mb-4 w-full rounded-xl border border-rose-400/30 p-2 focus:border-wine-500 focus:outline-none"
            rows={2}
          />

          <label className="mb-1 block text-sm text-plum-900/70">الروشتة</label>
          <textarea
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
            className="mb-4 w-full rounded-xl border border-rose-400/30 p-2 focus:border-wine-500 focus:outline-none"
            rows={3}
          />

          <button
            onClick={completeVisit}
            className="rounded-full bg-sage-500 px-6 py-2 font-medium text-white transition hover:bg-sage-400"
          >
            إنهاء الكشف وإرسال الروشتة
          </button>
        </div>
      )}

      <section className="mt-8">
        <h3 className="mb-2 font-display font-semibold text-wine-600">قائمة الانتظار</h3>
        <ol className="space-y-2">
          {waiting.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-rose-400/10 bg-white p-2 shadow-soft"
            >
              <span className="queue-badge h-8 w-8 flex-shrink-0 text-sm font-bold">
                {a.queueNumber}
              </span>
              {a.patient.name}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
