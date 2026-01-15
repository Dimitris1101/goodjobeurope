import { Suspense } from "react";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <BillingClient />
    </Suspense>
  );
}

