import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In — looptn",
};

// Force dynamic rendering to enable CSP nonces
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
