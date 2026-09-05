import { Hero } from '../landing/Hero';
import { Simulator } from '../landing/Simulator';
import { Stepper } from '../landing/Stepper';
import { Nav, StatsBand, PhotoBand, Features, Audiences, JourneyTimeline, RewardsCarousel, PilotBand, CtaFooter } from '../landing/Sections';
import { APP_URL } from '../lib/supabase';
import { useStore } from '../lib/store';

export function Landing() {
  const user = useStore((s) => s.user);
  const appLink = user ? '/' : '/login';
  const cta = user ? 'Open my app' : 'Open the app';
  const qrValue = `${APP_URL}/login?src=landing`;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-page text-ink">
      <Nav appLink={appLink} cta={cta} />
      <Hero appLink={appLink} userName={user?.name} cta={cta} />
      <StatsBand />
      <PhotoBand
        img="/landing/bales.jpg" alt="Bales of compacted PET bottles" credit="Photo: Grendelkhan · Wikimedia Commons · CC BY-SA 4.0"
        eyebrow="Why now" title="Vietnam faces a significant plastic-waste management challenge."
        body="Household waste must be separated into recyclable, food and other waste categories, with nationwide implementation required by 31 December 2024. Extended Producer Responsibility (EPR) for packaging also took effect from 1 January 2024."
        facts={[{ n: '3.1 million', l: 'tonnes of plastic waste are discarded on land annually' }, { n: '≥ 10%', l: 'leaking into waterways' }]}
      />
      <Simulator />
      <Stepper />
      <Features />
      <PhotoBand
        img="/landing/hcmc.jpg" alt="Apartment towers in Thu Thiem, Ho Chi Minh City" credit="Photo: Xuanphuocle · Wikimedia Commons · CC BY-SA 4.0" align="right"
        eyebrow="Target market" title="High-density apartment communities in Ho Chi Minh City."
        body="Especially developments with active resident communities, green-living initiatives, or difficulties implementing waste separation."
        facts={[{ n: '58,000', l: 'additional apartments from 80 projects by 2028' }, { n: '96%', l: 'of Vietnamese consumers are concerned about climate change' }]}
      />
      <Audiences />
      <JourneyTimeline />
      <RewardsCarousel />
      <PilotBand />
      <CtaFooter appLink={appLink} cta={cta} qrValue={qrValue} />
    </div>
  );
}
