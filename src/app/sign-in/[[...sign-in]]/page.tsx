import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-viral-500/10 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-ocean-500/10 blur-[120px]" />
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border-border shadow-2xl shadow-viral-500/10",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "bg-muted border-border text-foreground hover:bg-muted/80",
            formFieldInput:
              "bg-background border-input text-foreground focus:ring-viral-500",
            formButtonPrimary:
              "bg-viral-500 hover:bg-viral-600 text-white",
            footerActionLink: "text-viral-500 hover:text-viral-400",
          },
        }}
      />
    </div>
  );
}
