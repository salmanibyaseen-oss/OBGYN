# نظام إدارة العيادة الذكي - التصميم التقني

## نفس الستاك المستخدم في GP101
Next.js 14 + TypeScript + Prisma + PostgreSQL (Supabase) + Vercel
مع إضافة: Supabase Realtime (للطابور اللحظي) + WhatsApp Business API (Twilio أو 360dialog)

---

## 1. Database Schema (Prisma)

```prisma
// ========== المستخدمين والأدوار ==========
model User {
  id            String   @id @default(cuid())
  phone         String   @unique
  name          String
  role          Role     // PATIENT, DOCTOR, RECEPTION, ADMIN
  createdAt     DateTime @default(now())

  patientProfile PatientProfile?
  appointments   Appointment[]
}

enum Role {
  PATIENT
  DOCTOR
  RECEPTION
  ADMIN
}

// ========== الملف الطبي للمريضة ==========
model PatientProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])

  dateOfBirth   DateTime?
  bloodType     String?
  chronicConditions String? // أمراض مزمنة
  allergies     String?
  isPregnant    Boolean  @default(false)
  lastPeriodDate DateTime? // LMP لحساب عمر الحمل
  privacyMode   Boolean  @default(false) // إخفاء الاسم في شاشة الانتظار

  visits        Visit[]
  attachments   MedicalAttachment[]
}

// ========== الزيارات (السجل الطبي التراكمي) ==========
model Visit {
  id              String   @id @default(cuid())
  patientId       String
  patient         PatientProfile @relation(fields: [patientId], references: [id])
  appointmentId   String?  @unique
  appointment     Appointment? @relation(fields: [appointmentId], references: [id])

  visitDate       DateTime @default(now())
  visitType       VisitType // CHECKUP, FOLLOWUP, ULTRASOUND, EMERGENCY, DELIVERY
  diagnosis       String?
  prescription    String?  // نص أو JSON للروشتة
  ultrasoundNotes String?
  nextVisitDate   DateTime?
  doctorNotes     String?

  createdAt       DateTime @default(now())
}

enum VisitType {
  CHECKUP
  ANTENATAL_FOLLOWUP
  ULTRASOUND
  EMERGENCY
  DELIVERY
  POSTNATAL
}

model MedicalAttachment {
  id          String   @id @default(cuid())
  patientId   String
  patient     PatientProfile @relation(fields: [patientId], references: [id])
  fileUrl     String   // نتيجة تحليل / سونار مرفوع
  fileType    String
  uploadedAt  DateTime @default(now())
}

// ========== الحجوزات والطابور ==========
model Appointment {
  id              String   @id @default(cuid())
  patientUserId   String
  patient         User     @relation(fields: [patientUserId], references: [id])

  bookingSource   BookingSource // ONLINE, WALK_IN
  status          AppointmentStatus @default(WAITING)
  priority        Priority @default(NORMAL)

  queueNumber     Int
  estimatedTime   DateTime? // يتحدث ديناميكيًا
  checkedInAt     DateTime? // وقت تسجيل الحضور الفعلي (من الريسبشن)
  calledAt        DateTime?
  completedAt     DateTime?

  scheduledDate   DateTime // اليوم المحجوز فيه
  notifiedAt3Left DateTime? // آخر تنبيه واتساب "باقي 3"

  visit           Visit?
  createdAt       DateTime @default(now())
}

enum BookingSource {
  ONLINE
  WALK_IN
}

enum AppointmentStatus {
  WAITING
  CALLED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum Priority {
  EMERGENCY
  FOLLOWUP_URGENT
  NORMAL
}

// ========== أحداث العيادة (تأخير / طوارئ) ==========
model ClinicEvent {
  id          String   @id @default(cuid())
  type        EventType // DOCTOR_DELAY, EMERGENCY_CASE, BREAK, CLINIC_REOPENED
  delayMinutes Int?     // كم دقيقة تأخير متوقع
  note        String?
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?
}

enum EventType {
  DOCTOR_DELAY
  EMERGENCY_CASE
  BREAK
  CLINIC_CLOSED
  CLINIC_REOPENED
}

// ========== سجل الإشعارات (لمنع تكرار الإرسال) ==========
model NotificationLog {
  id            String   @id @default(cuid())
  appointmentId String
  type          String   // "3_LEFT", "REMINDER", "DELAY_ALERT", "PRESCRIPTION"
  sentAt        DateTime @default(now())
  channel       String   @default("WHATSAPP")
}
```

---

## 2. منطق حساب "الوقت المتوقع" (الجزء الأهم)

بدل رقم ثابت، اعمل **متوسط متحرك** لكل نوع كشف:

```typescript
// حساب متوسط وقت الكشف الفعلي لآخر 20 حالة من نفس النوع
async function getAvgConsultationTime(visitType: VisitType) {
  const recentVisits = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      visit: { visitType },
    },
    orderBy: { completedAt: 'desc' },
    take: 20,
    select: { calledAt: true, completedAt: true },
  });

  const durations = recentVisits
    .filter(v => v.calledAt && v.completedAt)
    .map(v => (v.completedAt!.getTime() - v.calledAt!.getTime()) / 60000);

  return durations.length
    ? durations.reduce((a, b) => a + b) / durations.length
    : 15; // fallback: 15 دقيقة افتراضي
}

// حساب الوقت المتوقع لدخول مريضة معينة
async function estimateWaitTime(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  const peopleAhead = await prisma.appointment.count({
    where: {
      scheduledDate: appt.scheduledDate,
      status: { in: ['WAITING', 'CALLED'] },
      queueNumber: { lt: appt.queueNumber },
    },
  });

  const avgTime = await getAvgConsultationTime('CHECKUP');
  const activeDelays = await prisma.clinicEvent.findMany({
    where: { resolvedAt: null },
  });
  const extraDelay = activeDelays.reduce((sum, e) => sum + (e.delayMinutes || 0), 0);

  return peopleAhead * avgTime + extraDelay; // بالدقايق
}
```

هذا الرقم يُعاد حسابه:
- كل ما حالة تكتمل (`COMPLETED`)
- كل ما يتسجل `ClinicEvent` جديد (تأخير/طوارئ)
- على فترات (cron كل 5 دقايق) عبر Supabase Edge Function

---

## 3. تنبيه واتساب عند "باقي 3"

Trigger بسيط بعد كل `COMPLETED`:

```typescript
async function checkAndNotifyUpcoming(scheduledDate: Date) {
  const waitingList = await prisma.appointment.findMany({
    where: { scheduledDate, status: 'WAITING' },
    orderBy: { queueNumber: 'asc' },
    take: 5,
    include: { patient: true },
  });

  const target = waitingList[2]; // صاحبة الدور الرابع تقريبًا (يبقى قدامها 3)
  if (target && !target.notifiedAt3Left) {
    await sendWhatsAppMessage(target.patient.phone,
      `باقي 3 حالات قبل دورك في عيادة د. [الاسم]. استعدي للحضور خلال ~${estimatedMinutes} دقيقة.`
    );
    await prisma.appointment.update({
      where: { id: target.id },
      data: { notifiedAt3Left: new Date() },
    });
  }
}
```

يُستدعى هذا الـ function من Supabase **Database Webhook** بيتفعل تلقائي وقت ما `AppointmentStatus` يتغير لـ `COMPLETED`.

---

## 4. الطابور الموحد (أونلاين + ريسبشن)

القاعدة: **رقم الدور (`queueNumber`) واحد موحّد** بغض النظر عن مصدر الحجز.

- الحجز الأونلاين ياخد رقم فور الحجز.
- الريسبشن لما تسجل حضور مريضة "ماشية" (walk-in) بتضيفها بنفس الـ sequence حسب وقت وصولها الفعلي.
- شاشة الانتظار في العيادة (تابلت أو شاشة معلقة) تعرض الطابور الموحّد realtime عبر Supabase Realtime subscription:

```typescript
supabase
  .channel('queue-updates')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'Appointment', filter: `scheduledDate=eq.${today}` },
    (payload) => updateQueueDisplay(payload)
  )
  .subscribe();
```

---

## 5. واجهة الريسبشن (Dashboard)

شاشة بسيطة فيها:
- قائمة الحجوزات الأونلاين لليوم (لسه ما وصلوش)
- زرار "تسجيل حضور" لكل مريضة أونلاين لما توصل فعليًا
- زرار "إضافة walk-in" لمن يحجز في المكان
- زرار سريع لتسجيل حدث: "الدكتورة اتأخرت 20 دقيقة" / "حالة طارئة"

---

## 6. واجهة الدكتورة

- زرار "التالي" ينادي أول واحدة في الطابور (`CALLED`)
- بعد الكشف: كتابة التشخيص/الروشتة → `COMPLETED` → تتبعت الروشتة أوتوماتيك على واتساب
- Dashboard إحصائيات: متوسط وقت الكشف، عدد الحالات اليوم، أكتر ساعات الزحمة

---

## 7. اعتبارات خصوصية مهمة (عيادة نساء)

- `privacyMode` في `PatientProfile`: لو مفعّل، شاشة الانتظار العامة تعرض رقم بس مش اسم.
- بيانات الحمل/التاريخ الطبي محمية بـ Row Level Security في Supabase (كل مريضة تشوف بياناتها بس، الدكتورة والريسبشن حسب الصلاحية).
- رسائل الواتساب متبعتش تفاصيل طبية حساسة، بس تنبيهات دور/موعد.

---

## نقطة البداية المقترحة (MVP)

لو حابب تبدأ بأقل نسخة ممكنة وتوسّع تدريجي:
1. جدول `Appointment` + `queueNumber` + شاشة انتظار realtime
2. تسجيل حضور من الريسبشن (يدمج أونلاين وووك-إن)
3. تنبيه واتساب "باقي 3" فقط
4. لاحقًا: السجل الطبي الكامل + الروشتة + الإحصائيات

هذا يخليك تطلع نسخة شغالة بسرعة وتضيف الطبقات المعقدة بعدين، بدل ما تحاول تبني كل حاجة مرة واحدة.
