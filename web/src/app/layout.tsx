import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reservo — Reservation Engine",
  description: "A modern reservation system with real-time availability and no overbooking guarantee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${fraunces.variable} ${dmSans.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            },
            classNames: {
              success: 'toast-success',
              error: 'toast-error',
              warning: 'toast-warning',
              info: 'toast-info',
            },
          }}
        />
      </body>
    </html>
  );
}
