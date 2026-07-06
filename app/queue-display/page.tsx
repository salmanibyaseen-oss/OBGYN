"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Appointment = {
  id: string;
  queueNumber: number;
  status: string;
  estimatedTime: string | null;
  patient: { name: string };
};

export default function QueueDisplayPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [delayNotice, setDelayNotice] = useState<string | null>(null);

  async function fetchAppointments() {
    const today = new Date().toISOString();
    const res = await fetch(`/api/appointments?date=${today}`);
    const data = await res.json();
    setAppointments(data);
  }

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Appointment" },
        () => fetchAppointments()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ClinicEvent" },
        (payload) => {
          const ev = payload.new as { type: string; delayMinutes: number | null };
          if (ev.type === "DOCTOR_DELAY" || ev.type === "EMERGENCY_CASE") {
            setDelayNotice(
              ev.type === "EMERGENCY_CASE"
                ? "تأخير بسبب حالة طارئة، نعتذر عن الإزعاج"
                : `تأخير متوقع حوالي ${ev.delayMinutes ?? "بضع"} دقيقة`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const waiting = appointments.filter((a) => a.status === "WAITING");
  const current = appointments.find((a) => a.status === "CALLED" || a.status === "IN_PROGRESS");

  return (
    <main dir="rtl" className="arc-decoration min-h-screen bg-blush-50 p-8 font-body">
      <div className="mb-8 flex items-center gap-3">
        <div className="queue-badge h-12 w-12 flex-shrink-0 text-lg font-display font-semibold">
          ♀
        </div>
        <h1 className="font-display text-3xl font-semibold text-wine-700">شاشة انتظار العيادة</h1>
      </div>
      <div className="arc-divider mb-8" />

      {delayNotice && (
        <div className="mb-8 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-plum-900">
          ⚠️ {delayNotice}
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-3 font-display text-lg font-semibold text-wine-600">الحالة الحالية</h2>
        {current ? (
          <div className="rounded-[2rem] bg-gradient-to-br from-wine-500 to-wine-700 p-8 text-center text-blush-50 shadow-soft">
            <p className="text-sm opacity-80">جاري الكشف الآن</p>
            <p className="font-display text-5xl font-semibold">دور رقم {current.queueNumber}</p>
          </div>
        ) : (
          <p className="text-plum-900/40">لا توجد حالة قيد الكشف حاليًا</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-wine-600">قائمة الانتظار</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {waiting.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-rose-400/20 bg-white p-5 text-center shadow-soft"
            >
              <p className="queue-badge mx-auto mb-2 h-14 w-14 font-display text-xl font-bold">
                {a.queueNumber}
              </p>
              <p className="text-sm text-plum-900/60">
                {a.estimatedTime
                  ? new Date(a.estimatedTime).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "..."}
              </p>
            </div>
          ))}
          {waiting.length === 0 && <p className="text-plum-900/40">لا يوجد منتظرين</p>}
        </div>
      </section>
    </main>
  );
}
