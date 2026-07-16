import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplyFlow } from "@/components/apply/ApplyFlow";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const metadata: Metadata = {
  title: "Application Process",
  description:
    "Apply for an Afghanistan visa — choose visa type, review requirements, fees, and complete your application with Salaam Afghanistan.",
};

function ApplyFallback() {
  return (
    <div style={{ padding: "3rem 1.25rem", textAlign: "center", color: "#71717a" }}>
      Loading application…
    </div>
  );
}

export default function ApplyPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<ApplyFallback />}>
        <ApplyFlow />
      </Suspense>
    </ProtectedRoute>
  );
}
