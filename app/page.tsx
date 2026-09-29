import { ExhibitorSection } from "@/components/ExhibitorSection";
import { Hero } from "@/components/Hero";
import { IntroSection } from "@/components/IntroSection";
import { ConsultSection } from "@/components/ConsultSection";
import { ProductsSection } from "@/components/ProductsSection";
import { products } from "@/lib/data/products";

export default function Home() {
  return (
    <main>
      <Hero />
      <IntroSection />
      <ProductsSection products={products} />
      <ExhibitorSection />
      <ConsultSection />
    </main>
  );
}
