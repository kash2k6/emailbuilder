export function Footer() {
  return (
    <footer className="border-t py-4 bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} WhopMail.com
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Powered by <a href="https://whop.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Whop.com</a>
        </p>
      </div>
    </footer>
  )
}
