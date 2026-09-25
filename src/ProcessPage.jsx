import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowUpRight } from 'lucide-react';
import { MarketingLayout, processSteps } from './MarketingLayout.jsx';

export default function ProcessPage() {
  return (
    <MarketingLayout>
      <Helmet>
        <title>How It Works | Open Doors Laundromat</title>
        <meta name="description" content="Our simple 5-step laundry process: collect, sort, clean, finish, deliver." />
        <link rel="canonical" href="/process" />
        <meta property="og:title" content="How It Works | Open Doors Laundromat" />
        <meta property="og:description" content="Our simple 5-step laundry process." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://open-doors-laundory.vercel.app/process" />
      </Helmet>

      <section className="process-page">
        <div className="section-head">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Simple as 1-2-3.</h2>
          </div>
          <p>From drop-off to delivery, our process keeps your laundry moving.</p>
        </div>
        <div className="process-steps-page">
          {processSteps.map((step, i) => (
            <div key={step.step} className="process-step-card">
              <div className="process-step-circle">{step.step}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              {i < processSteps.length - 1 && (
                <div className="process-connector">
                  <div className="process-line"></div>
                  <div className="process-arrow-icon"><ArrowUpRight size={20} /></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
