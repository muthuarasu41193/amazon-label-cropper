import type { Metadata } from "next";
import { Suspense } from "react";
import { ManifestWorkspace } from "@/components/dashboard/ManifestWorkspace";
import { CropDashboardSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Manifest Creator",
  description: "Build a dispatch handover sheet from Amazon, Meesho, and Flipkart shipping labels. Runs locally in your browser.",
};

export default function ManifestPage() {
  return (
    <Suspense fallback={<CropDashboardSkeleton />}>
      <ManifestWorkspace />
    </Suspense>
  );
}
