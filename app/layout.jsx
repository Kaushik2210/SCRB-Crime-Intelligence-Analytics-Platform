import { Inter, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata = {
  title: "SCRB Crime Intelligence Platform | Karnataka State Police",
  description:
    "AI-driven crime analytics and visualization platform for the Karnataka State Police State Crime Records Bureau.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Catalyst Web SDK: client-side counterpart to the server-side
          zcatalyst-sdk-node usage in server.js/lib/*.js. `/__catalyst/sdk/init.js`
          is a virtual path served only by Catalyst's own AppSail runtime, so it
          404s in local/demo mode. Skip both scripts unless the app is actually
          running under Catalyst (DEMO_MODE off) to keep the local console clean.
          Order matters: init.js expects window.catalyst (from the first script)
          to already exist, so both load with beforeInteractive, in sequence.
        */}
        {process.env.DEMO_MODE !== "true" ? (
          <>
            <Script
              src="https://static.zohocdn.com/catalyst/sdk/js/4.6.2/catalystWebSDK.js"
              strategy="beforeInteractive"
            />
            <Script src="/__catalyst/sdk/init.js" strategy="beforeInteractive" />
          </>
        ) : null}
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
