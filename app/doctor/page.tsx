"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string;
  queueNumber: number;
  status: string;
  patient: { name: string };
};

export default function DoctorPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");

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

  async function callNext() {
    const next = waiting[0];
    if (!next) return;
    await fetch(`/api/appointments/${next.id}/call`, { method: "PATCH" });
    setActiveId(next.id);
    await fetchAppointments();
  }

  async function completeVisit() {
    if (!activeId) return;
    await fetch(`/api/appointments/${activeId}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, prescription, visitType: "CHECKUP" }),
    });
    setActiveId(null);
    setDiagnosis("");
    setPrescription("");
    await fetchAppointments();
  }

  return (
    <main dir="rtl" className="min-h-screen bg-blush-50 p-6 font-body">
      <div className="mb-6 flex items-center gap-3">
        <div className="queue-badge h-10 w-10 flex-shrink-0 text-base font-display">♀</div>
        <h1 className="font-display text-2xl font-semibold text-wine-700">لوحة الدكتور</h1>
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
