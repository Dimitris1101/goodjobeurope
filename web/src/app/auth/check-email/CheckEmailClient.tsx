"use client";
import { useSearchParams } from "next/navigation";

export default function CheckEmailPage() {
  const sp = useSearchParams();
  const email = sp.get("email");

  return (
    <main className="min-h-[60vh] grid place-items-center px-4">
      <div className="max-w-md w-full rounded-2xl border p-6 text-center">
        <h1 className="text-2xl font-semibold">Check your e-mail confirmation</h1>
        <p className="mt-2 text-gray-600">
          We send a confirmation link to <span className="font-medium">{email ?? "email σας"}</span>.
        </p>
        <p className="mt-1 text-gray-500 text-sm">
          After confirming, you will be taken to the page <strong>Log in</strong>.
        </p>

        <div className="mt-6 text-sm text-gray-600">
          Didn't receive an email? Check your spam folder.
        </div>

        <a href="/auth/login" className="mt-6 inline-block rounded-xl bg-blue-600 px-4 py-2.5 text-white">
          Go to Log in Page
        </a>
      </div>
    </main>
  );
}