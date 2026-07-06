import Link from "next/link";

export default function HomePage() {
  const links = [
    { href: "/reception", label: "لوحة الريسبشن", desc: "تسجيل الحضور وإدارة الأحداث" },
    { href: "/doctor", label: "لوحة الدكتورة", desc: "نداء المريضات وتسجيل الكشف" },
    { href: "/queue-display", label: "شاشة الانتظار", desc: "العرض العام في العيادة" },
  ];

  return (
    <main dir="rtl" className="min-h-screen bg-blush-50 p-8 font-body">
      <div className="mb-10 flex items-center gap-3">
        <div className="queue-badge h-12 w-12 flex-shrink-0 text-lg font-display font-semibold">
          ♀
        </div>
        <h1 className="font-display text-3xl font-semibold text-wine-700">
          نظام إدارة العيادة
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-rose-400/20 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="mb-2 font-display text-lg font-semibold text-wine-600">
              {link.label}
            </h2>
            <p className="text-sm text-plum-900/60">{link.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
