import { SignUp } from "@clerk/clerk-react";
import { Pill } from "lucide-react";

/**
 * Full-page sign-up screen.
 * Uses Clerk's pre-built <SignUp /> component with dark-theme styling.
 */
export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Brand header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl border border-primary/40 bg-primary/15 flex items-center justify-center">
          <Pill className="text-primary" size={20} />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            PharmAssist
          </div>
          <div className="text-lg font-semibold text-foreground">Portfolio Studio</div>
        </div>
      </div>

      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border border-border shadow-2xl rounded-2xl",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "bg-secondary border border-border text-foreground hover:bg-secondary/80",
            formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
            formFieldInput: "bg-background border-border text-foreground",
            formFieldLabel: "text-foreground",
            footerActionLink: "text-primary hover:text-primary/80",
            identityPreviewEditButton: "text-primary",
          },
        }}
      />
    </div>
  );
}
