import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create Account — looptn",
};

// Force dynamic rendering to enable CSP nonces
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
