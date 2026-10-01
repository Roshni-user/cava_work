import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ExhibitorCatalogueProvider } from "@/components/ExhibitorCatalogue";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { products } from "@/lib/data/products";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cavli Wireless",
  description:
    "Hubble landing page for Cavli Wireless connectivity features, catalogue exhibitors, and consultation requests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ExhibitorCatalogueProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer products={products} />
        </ExhibitorCatalogueProvider>
      </body>
    </html>
  );
}
