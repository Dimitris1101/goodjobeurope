import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* animated background blob */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-blue-200 blur-3xl opacity-60 animate-pulse" />

      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 flex flex-col md:flex-row items-center md:items-start gap-10">
        {/* LEFT TEXT CONTENT */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
            We know you <span className="text-blue-600">can do it</span>.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto md:mx-0">
            Companies post job ads based on location and industry. Employees set what they are looking for and get matched instantly.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
            >
              Start for free
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto px-5 py-3 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm sm:text-base"
            >
              View plans
            </Link>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="flex-1 flex justify-center md:justify-end mt-6 md:mt-0">
          <img
            src="/europe.jpg"
            alt="Europe job matching"
            className="w-full max-w-xs sm:max-w-sm md:max-w-md rounded-lg shadow-lg object-cover"
          />
        </div>
      </div>
    </section>
  );
}
