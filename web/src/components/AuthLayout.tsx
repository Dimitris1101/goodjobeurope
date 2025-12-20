export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/signup_back.jpg')" }}
      />
      {/* σκοτεινό overlay για κοντράστ */}
      <div className="absolute inset-0 bg-black/50" />

      <main className="relative z-10 grid min-h-screen place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white/90 backdrop-blur shadow-xl p-6">
          {children}
        </div>
      </main>
    </div>
  );
}