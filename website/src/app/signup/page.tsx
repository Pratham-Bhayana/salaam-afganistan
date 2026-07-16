import type { Metadata } from "next";
import { SignupClient } from "./SignupClient";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a Salaam Afghanistan account to start your visa application.",
};

export default function SignupPage() {
  return <SignupClient />;
}
