import { Link } from 'react-router-dom';
import { ShieldCheck, Scale, MapPin, Smartphone } from 'lucide-react';

const VALUES = [
  { icon: Scale, title: 'Non-partisan', text: 'Every party and every independent gets the same tools at the same price. We never take sides.' },
  { icon: ShieldCheck, title: 'Your data is yours', text: 'Voter lists, results and donor records belong to your campaign alone — private, exportable, never sold.' },
  { icon: Smartphone, title: 'Built for the field', text: 'Designed for basic Android phones and patchy data — because campaigns are won in communities, not offices.' },
  { icon: MapPin, title: 'Made in Ghana', text: 'Regions, constituencies, polling stations, MoMo and local languages are built in from day one.' },
];

export default function About() {
  return (
    <div>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-12">
        <p className="eyebrow">About CampaignHub</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-ink text-balance">Professional campaign tools shouldn&apos;t be a luxury.</h1>
        <div className="mt-8 space-y-5 text-lg text-ink-2 leading-relaxed">
          <p>
            Big campaigns have data teams, call centres and results rooms. Most candidates in Ghana — assembly members, MMDCE hopefuls, first-time parliamentary aspirants — have notebooks, WhatsApp groups and good intentions.
          </p>
          <p>
            CampaignHub closes that gap. For the price of a few banners a month, any candidate can know their voters, organise volunteers, measure their advertising and see election-day results as they happen.
          </p>
          <p>
            We believe better-organised campaigns mean better-informed voters and more accountable leaders — whoever wins.
          </p>
        </div>
      </section>
      <section className="bg-surface border-y border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((v) => (
            <div key={v.title}>
              <v.icon className="w-7 h-7 text-accent-ink" />
              <h2 className="mt-4 text-lg font-bold text-ink">{v.title}</h2>
              <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">Ready to run a better campaign?</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="btn btn-lg btn-primary">Start free trial</Link>
          <Link to="/support" className="btn btn-lg btn-secondary">Talk to us</Link>
        </div>
      </section>
    </div>
  );
}
