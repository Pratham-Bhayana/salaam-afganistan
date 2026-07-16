import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "My Profile",
  description:
    "View your Salaam Afghanistan visa application status, personal details, documents, and payment information.",
};

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileView />
    </ProtectedRoute>
  );
}
