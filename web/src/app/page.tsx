import { Suspense } from "react";
import HomeClient from "./HomeClient";

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
      <HomeClient />
    </Suspense>
  );
}

