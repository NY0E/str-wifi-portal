import type { Metadata } from "next";
import { Rajdhani, DM_Sans } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BaseKC Guest WiFi",
  description: "Guest WiFi portal for BaseKC",
  icons: {
    icon: [
      { url: "/brand/basekc-icon.svg", type: "image/svg+xml" },
      { url: "/basekc-icon.png", type: "image/png" },
    ],
    apple: "/basekc-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
