import { EmailBuilderLayout } from "@/components/email-builder/email-builder-layout";
import { EmailBuilderProvider } from "@/contexts/email-builder-context";

export default function EmailBuilder() {
  return (
    <EmailBuilderProvider>
      <div className="h-screen bg-background">
        <EmailBuilderLayout />
      </div>
    </EmailBuilderProvider>
  );
}
