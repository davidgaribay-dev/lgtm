import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — looptn",
};

// Force dynamic rendering to enable CSP nonces
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
