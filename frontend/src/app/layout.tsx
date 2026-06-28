import type { Metadata } from "next";
import "./globals.css";
import ConsoleShell from "@/components/ConsoleShell";

export const metadata: Metadata = {
  title: "AWS Route 53 Console - Home",
  description: "A fully functional clone of the AWS Route 53 console for managing hosted zones and DNS records with SQLite storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
        <ConsoleShell>
          {children}
        </ConsoleShell>
      </body>
    </html>
  );
}
