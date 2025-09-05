import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/whopmail-KoJ05lt67sSryqfgBQDYSkIceR1eRk.png"
              alt="Email Marketing"
              className="h-8 w-8 p-0.5"
            />
            <span className="hidden font-bold sm:inline-block">Email Marketing</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-4 lg:space-x-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-orange-600">
            Home
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-orange-600"
          >
            Pricing
          </Link>
        </nav>
      </div>
    </header>
  )
}
