'use client';

export default function AboutSection() {
  return (
    <section className="w-full py-20 bg-white">
      <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 md:grid-cols-[350px_1fr] gap-12 items-center">
        
        {/* Left Images Grid - slender like CodePen */}
        <div className="grid grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-lg shadow-lg h-48 md:h-64 transform -translate-y-3 hover:scale-110 transition duration-500 cursor-pointer">
            <img src="/about1.jpg" alt="About 1" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-lg shadow-lg h-48 md:h-64 transform translate-y-3 hover:scale-110 transition duration-500 cursor-pointer">
            <img src="/about2.jpg" alt="About 2" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-lg shadow-lg h-48 md:h-64 transform -translate-y-3 hover:scale-110 transition duration-500 cursor-pointer">
            <img src="/about3.jpg" alt="About 3" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-lg shadow-lg h-48 md:h-64 transform translate-y-3 hover:scale-110 transition duration-500 cursor-pointer">
            <img src="/about4.jpg" alt="About 4" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Right Content */}
        <div className="flex flex-col gap-6">
          <h4 className="text-xl font-medium text-orange-600">Καλώς Ήρθες Στο GOODJOBEUROPE</h4>
          <h2 className="text-4xl font-bold text-slate-900 leading-tight">
            Η επόμενη γενιά εύρεσης εργασίας & σύνδεσης ταλέντων
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Εδώ μπορείς να δημιουργήσεις το προφίλ σου, να συνδεθείς άμεσα με εταιρείες ή υποψηφίους, 
            και να χρησιμοποιήσεις τεχνολογία AI για να βρεις την καλύτερη δυνατή επαγγελματική ευκαιρία.
            Η πλατφόρμα μας είναι σχεδιασμένη για να φέρνει αποτελέσματα με τον πιο έξυπνο και ανθρώπινο τρόπο.
          </p>
          <a
            href="#"
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition"
          >
            Περισσότερα →
          </a>
        </div>
      </div>
    </section>
  );
}
