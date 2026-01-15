"use client";

import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <>
    <Header />
    
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/bac_log-in.jpg')" }}
    >
      {/* Φόρμα μαυρο πλαισιο */}
      <div className="w-full max-w-md bg-black/60 p-8 rounded-xl shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          Σύνδεση σε λογαριασμό
        </h1>
        <LoginForm />
      </div>
    </div>
    </>
  );
}
