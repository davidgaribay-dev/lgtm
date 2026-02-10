import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create Account — LGTM",
};

export default function SignupPage() {
  return <SignupForm />;
}
