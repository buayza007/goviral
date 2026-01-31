import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoViral - Viral Content Discovery Platform",
  description: "ค้นหาและวิเคราะห์ Viral Content จาก Social Media ได้ง่ายๆ สำหรับนักการตลาดมืออาชีพ",
  keywords: ["viral content", "social media", "marketing", "analytics", "facebook", "instagram", "tiktok"],
  authors: [{ name: "GoViral Team" }],
  openGraph: {
    title: "GoViral - Viral Content Discovery Platform",
    description: "ค้นหาและวิเคราะห์ Viral Content จาก Social Media",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="th" className="dark">
        <body className="min-h-screen bg-background antialiased">
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
