# نظام إدارة طابور العيادة - MVP

## التثبيت

```bash
npm install next react react-dom typescript @prisma/client @supabase/supabase-js
npm install -D prisma @types/react @types/node tailwindcss postcss autoprefixer
npx prisma generate
npx prisma db push
```

## متغيرات البيئة (.env)

```
DATABASE_URL="postgresql://...supabase connection string..."
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxxx"

TWILIO_ACCOUNT_SID="xxxx"
TWILIO_AUTH_TOKEN="xxxx"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

## تفعيل Realtime في Supabase

لازم تفعّل replication على جدول `Appointment` و `ClinicEvent` من لوحة تحكم Supabase:
Database → Replication → فعّل الجدولين.

## هيكل الصفحات

- `/queue-display` — الشاشة المعلقة في العيادة (تعرض الدور الحالي + قائمة الانتظار realtime)
- `/reception` — لوحة الريسبشن (تسجيل حضور + تسجيل تأخير/طوارئ)
- `/doctor` — لوحة الدكتورة (نداء التالية + تسجيل التشخيص والروشتة)

## تدفق العمل (Flow)

1. مريضة تحجز أونلاين → `POST /api/appointments` (bookingSource: ONLINE) → تاخد رقم دور
2. أو تيجي على العيادة مباشرة → الريسبشن تعمل نفس الـ POST (bookingSource: WALK_IN)
3. لما توصل فعليًا → الريسبشن تضغط "تسجيل حضور" → `PATCH /api/appointments/:id/checkin`
4. الدكتورة تضغط "نداء التالية" → `PATCH /api/appointments/:id/call`
5. بعد الكشف: الدكتورة تسجل التشخيص/الروشتة → `PATCH /api/appointments/:id/complete`
   - يترسل الروشتة على واتساب تلقائيًا
   - يتحدث تقدير وقت الانتظار لكل المنتظرين
   - يترسل تنبيه "باقي 3" لصاحبة الدور المناسب
6. لو حصل تأخير أو طوارئ: الريسبشن تسجل الحدث → `POST /api/events` → تنبيه فوري لكل المنتظرين

## الخطوات التالية المقترحة

- إضافة صفحة حجز عامة للمريضات (`/book`)
- ربط JWT auth (زي اللي عندك في GP101) بدل افتراض patientUserId
- صفحة سجل طبي كامل للمريضة (Visit history)
- Cron job على Supabase Edge Functions لإعادة حساب `estimatedTime` كل 5 دقايق تلقائيًا
