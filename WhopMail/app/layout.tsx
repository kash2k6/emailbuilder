import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { WhopProvider } from "@/components/whop-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EmailSync - Email Marketing Integration",
  description: "Connect your Whop members to email marketing platforms",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <WhopProvider>{children}</WhopProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
