import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AWS AIF-C01 Practice",
  description:
    "Practica para el examen AWS Certified AI Practitioner (AIF-C01). Preguntas de practica por dominio con explicaciones detalladas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}
