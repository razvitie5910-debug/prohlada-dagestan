import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Прохлада — гостевой дом в Дагестане",
  description:
    "Приватный семейный отдых: коттеджи, бассейн с водопадом, баня, чан и вся территория только для вашей компании.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Прохлада — место, где становится тише",
    description:
      "Гостевой дом с коттеджами, бассейном, баней и приватной территорией в Дагестане.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
