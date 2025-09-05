import { redirect } from "next/navigation"

export default function HomePage() {
  // Redirect to the discover view for public access
  redirect("/discover")
}
