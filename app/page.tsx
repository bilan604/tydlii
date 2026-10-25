import { Closer } from "@/components/Closer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Pillars } from "@/components/Pillars";
import { QuoteCalculator } from "@/components/QuoteCalculator";
import { Waitlist } from "@/components/Waitlist";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Pillars />
      <QuoteCalculator />
      <HowItWorks />
      <Waitlist />
      <Closer />
    </main>
  );
}
