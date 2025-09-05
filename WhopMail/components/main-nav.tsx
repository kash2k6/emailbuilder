import Link from "next/link"
import Image from "next/image"

export function MainNav() {
  return (
    <div className="flex items-center space-x-4">
      <Link href="/dashboard" className="flex items-center space-x-2">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/whopmail-XEswShpqhNDThyaCtdQc9pZAKdqLIo.png"
          alt="Email Marketing Logo"
          width={40}
          height={40}
          className="h-10 w-auto rounded-md"
        />
        <span className="font-bold text-xl text-foreground">Email Marketing</span>
      </Link>
      <nav className="flex items-center space-x-4 text-sm font-medium">
        <Link href="/dashboard" className="text-foreground transition-colors hover:text-orange-600">
          Dashboard
        </Link>
      </nav>
    </div>
  )
}
