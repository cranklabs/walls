import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

import "@/styles/globals.css"

import { GeistSans } from "geist/font/sans"
import { type Metadata } from "next"
import localFont from "next/font/local"
import { Suspense } from "react"

import { Navbar } from "./_components/navbar"
import { Providers } from "./_components/providers"

export const metadata: Metadata = {
  title: "Walls",
  description: "Beautiful backgrounds for your screens",
}

const ClashDisplay = localFont({
  src: "../../fonts/ClashDisplay-Variable.woff2",
  variable: "--font-clash-display",
})

const Satoshi = localFont({
  src: [
    {
      path: "../../fonts/Satoshi-Variable.woff2",
      style: "normal",
    },
    {
      path: "../../fonts/Satoshi-VariableItalic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
})

const RemixSatoshi = localFont({
  src: [
    { path: "../../fonts/Satoshi-Variable.woff2", style: "normal" },
    { path: "../../fonts/Satoshi-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-remix-satoshi",
  display: "block",
})

const RemixClashDisplay = localFont({
  src: "../../fonts/ClashDisplay-Variable.woff2",
  variable: "--font-remix-clash-display",
  display: "block",
})

const RemixFraunces = localFont({
  src: "../../fonts/Fraunces-Variable.woff2",
  variable: "--font-remix-fraunces",
  display: "block",
})

const RemixJetBrainsMono = localFont({
  src: "../../fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-remix-jetbrains-mono",
  display: "block",
})

const RemixCaveat = localFont({
  src: "../../fonts/Caveat-Variable.woff2",
  variable: "--font-remix-caveat",
  display: "block",
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        GeistSans.variable,
        ClashDisplay.variable,
        Satoshi.variable,
        RemixSatoshi.variable,
        RemixClashDisplay.variable,
        RemixFraunces.variable,
        RemixJetBrainsMono.variable,
        RemixCaveat.variable,
      )}
      suppressHydrationWarning
    >
      <body className="flex h-screen flex-col dark:bg-black">
        <Providers>
          <Suspense>
            <Navbar />
            {children}
          </Suspense>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
