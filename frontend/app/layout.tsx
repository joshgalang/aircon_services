import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { AppNav } from "@/components/AppNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aircon CMS — Service operations for every branch",
  description:
    "Cloud software for aircon businesses: customer inquiries, job scheduling, and inventory—scoped per branch, ready to scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen antialiased`}>
        <AuthProvider>
          <AppNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
