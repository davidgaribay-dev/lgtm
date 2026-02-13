import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password — looptn",
};

// Force dynamic rendering to enable CSP nonces
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
