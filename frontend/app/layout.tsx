import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import toast, { Toaster } from "react-hot-toast"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Alex Melia AI",
  description: "An AI version of myself, Alex Melia",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="./me.jpg" sizes="any" />
      <body className={inter.className}>
        <Toaster />
        {children}
      </body>
    </html>
  )
}
