"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string;
  queueNumber: number;
  status: string;
  bookingSource: string;
  checkedInAt: string | null;
  patient: { name: string; phone: string };
};

export default function ReceptionPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [loading, setLoading] = useState(false);

  async function fetchAppointments() {
    const today = new Date().toISOString();
    const res = await fetch(`/api/appointments?date=${today}`);
    setAppointments(await res.json());
  }

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 10000); // تحديث كل 10 ثواني
    return () => clearInterval(interval);
  }, []);

  async function checkIn(id: string) {
    setLoading(true);
    await fetch(`/api/appointments/${id}/checkin`, { method: "PATCH" });
    await fetchAppointments();
    setLoading(false);
  }

  async function reportDelay() {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DOCTOR_DELAY", delayMinutes, note: "تأخير من الريسبشن" }),
    });
    alert("تم تسجيل التأخير وإبلاغ المنتظرين");
  }

  async function reportEmergency() {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "EMERGENCY_CASE", delayMinutes: 30, note: "حالة طارئة" }),
    });
    alert("تم تسجيل الحالة الطارئة وإبلاغ المنتظرين");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-blush-50 p-6 font-body">
      <div className="mb-6 flex items-center gap-3">
        <div className="queue-badge h-10 w-10 flex-shrink-0 text-base font-display">♀</div>
        <h1 className="font-display text-2xl font-semibold text-wine-700">لوحة الريسبشن</h1>
      </div>
      <div className="arc-divider mb-6" />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/20 bg-white p-4 shadow-soft">
        <span className="font-medium text-plum-900">تسجيل حدث:</span>
        <input
          type="number"
          value={delayMinutes}
          onChange={(e) => setDelayMinutes(Number(e.target.value))}
          className="w-20 rounded-lg border border-rose-400/30 p-1 text-center focus:border-wine-500 focus:outline-none"
        />
        <span className="text-sm text-plum-900/60">دقيقة</span>
        <button
          onClick={reportDelay}
          className="rounded-full bg-amber-500 px-5 py-2 text-white transition hover:bg-amber-600"
        >
          الدكتورة اتأخرت
        </button>
        <button
          onClick={reportEmergency}
          className="rounded-full bg-wine-600 px-5 py-2 text-white transition hover:bg-wine-700"
        >
          حالة طارئة
        </button>
      </div>

      <table className="w-full overflow-hidden rounded-2xl border border-rose-400/20 bg-white text-right shadow-soft">
        <thead className="bg-blush-100 text-wine-700">
          <tr>
            <th className="p-3 font-display font-semibold">الدور</th>
            <th className="p-3 font-display font-semibold">الاسم</th>
            <th className="p-3 font-display font-semibold">المصدر</th>
            <th className="p-3 font-display font-semibold">الحالة</th>
            <th className="p-3 font-display font-semibold">إجراء</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.id} className="border-t border-rose-400/10">
              <td className="p-3 font-bold text-wine-600">{a.queueNumber}</td>
              <td className="p-3">{a.patient.name}</td>
              <td className="p-3">{a.bookingSource === "ONLINE" ? "أونلاين" : "حضوري"}</td>
              <td className="p-3">{a.status}</td>
              <td className="p-3">
                {!a.checkedInAt && (
                  <button
                    disabled={loading}
                    onClick={() => checkIn(a.id)}
                    className="rounded-full bg-sage-500 px-3 py-1 text-white transition hover:bg-sage-400"
                  >
                    تسجيل حضور
                  </button>
                )}
                {a.checkedInAt && <span className="text-sage-500">✓ حاضرة</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
