// src/app/[locale]/page.tsx
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Pricing from "@/components/Pricing";
import AnimationStrip from "@/components/AnimationStrip";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Pricing />
        <AnimationStrip />
      </main>
      <Footer />
    </div>
  );
}
