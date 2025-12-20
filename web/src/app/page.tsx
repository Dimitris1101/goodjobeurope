import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import InfoTimeline from '@/components/InfoTimeline';
import AboutSection from "@/components/AboutSection";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Pricing />
        <InfoTimeline />
        <AboutSection /> 
      </main>
      <Footer />
    </div>
  );
}
