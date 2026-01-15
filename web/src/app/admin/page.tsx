import { Suspense } from "react";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading admin…
        </div>
      }
    >
      <AdminClient />
    </Suspense>
  );
}

