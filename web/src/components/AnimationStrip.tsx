export default function AnimationStrip() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-24">
        <img
          src="/hero.jpg"
          alt="Job matching hero"
          className="w-full h-110 md:h-150 object-cover rounded-2xl shadow"
          loading="lazy"
        />
        <p className="text-center text-sm text-gray-500 mt-3">
          "GOODJOBEUROPE" connected people.
        </p>
      </div>
    </section>
  );
}