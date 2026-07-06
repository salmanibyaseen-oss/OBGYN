import "./globals.css";

export const metadata = {
  title: "نظام إدارة العيادة",
  description: "نظام حجز وإدارة طابور لعيادة النساء",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
