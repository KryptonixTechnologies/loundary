import React from 'react';
import { Helmet } from 'react-helmet-async';
import { MarketingLayout, faqs } from './MarketingLayout.jsx';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = React.useState(null);

  return (
    <MarketingLayout>
      <Helmet>
        <title>FAQ | Open Doors Laundromat</title>
        <meta name="description" content="Frequently asked questions about Open Doors Laundromat laundry services in Kitengela, Kenya." />
        <link rel="canonical" href="/faq" />
        <meta property="og:title" content="FAQ | Open Doors Laundromat" />
        <meta property="og:description" content="Frequently asked questions about our laundry services." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://open-doors-laundory.vercel.app/faq" />
      </Helmet>

      <main className="faq-page" id="main-content">
        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Frequently asked</p>
              <h2>Common questions.</h2>
            </div>
            <p>Find answers to the most common questions about our services.</p>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${openIndex === index ? 'open' : ''}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  aria-expanded={openIndex === index}
                >
                  <span>{faq.q}</span>
                  <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
                </button>
                {openIndex === index && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {faqs.length === 0 && (
            <p className="empty-state">No FAQs available yet.</p>
          )}
        </section>
      </main>
    </MarketingLayout>
  );
}
