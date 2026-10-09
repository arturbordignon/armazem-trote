import { loadHomePage } from '@/controllers/catalog.controller';
import { FreightExplainer } from '@/components/home/FreightExplainer';
import { Hero } from '@/components/home/Hero';
import { NewArrivals } from '@/components/home/NewArrivals';
import { SectionDrawers } from '@/components/home/SectionDrawers';
import { WantedPoster } from '@/components/home/WantedPoster';

/** Home. One cached loader; the whole page is prerendered into the static shell. */
export default async function HomePage() {
  const home = await loadHomePage();
  return (
    <>
      <Hero />
      <SectionDrawers sections={home.sections} />
      <NewArrivals products={home.newArrivals} />
      <WantedPoster />
      <FreightExplainer methods={home.freightMethods} />
    </>
  );
}
