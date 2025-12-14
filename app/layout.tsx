import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"] });

const DynamicToaster = dynamic(
  () => import('sonner').then((mod) => mod.Toaster),
  { ssr: false }
);

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <DynamicToaster position="top-right" richColors />
      </body>
    </html>
  );
}
