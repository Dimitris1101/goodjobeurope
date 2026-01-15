import { Suspense } from "react";
import PlanClient from "./PlanClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          Loading…
        </div>
      }
    >
      <PlanClient />
    </Suspense>
  );
}

