import React from 'react';
import { Helmet } from 'react-helmet-async';
import { MarketingLayout, business } from './MarketingLayout.jsx';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": business.name,
  "description": "Professional laundry and garment care service in Kitengela, Kenya.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Chuna Mall, Ground Floor, Shop 10",
    "addressLocality": "Kitengela",
    "addressCountry": "KE"
  },
  "telephone": business.phone,
  "url": "https://open-doors-laundory.vercel.app/about",
  "email": business.email,
  "sameAs": [business.whatsapp],
  "founder": {
    "@type": "Person",
    "name": "Elizabeth Wanjiru Njoroge"
  }
};

export default function AboutPage() {
  return (
    <MarketingLayout>
      <Helmet>
        <title>About Us | Open Doors Laundromat</title>
        <meta name="description" content="Learn about Open Doors Laundromat — professional laundry service in Kitengela, Kenya." />
        <link rel="canonical" href="/about" />
        <meta property="og:title" content="About Us | Open Doors Laundromat" />
        <meta property="og:description" content="Learn about Open Doors Laundromat." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://open-doors-laundory.vercel.app/about" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <section className="about-page">
        <div className="section-head">
          <div>
            <p className="eyebrow">About us</p>
            <h2>Who we are.</h2>
          </div>
          <p>We are a professional laundry service dedicated to quality and convenience.</p>
        </div>
        <div className="about-content">
          <div className="about-text">
            <p>
              Open Doors Laundromat is a professional laundry and garment care service located at Chuna Mall, Ground Floor, Shop 10, Kitengela, Kenya. We serve the communities of Kitengela, Kisaju, Isinya, Athi River, Mlolongo, and Kajiado.
            </p>
            <p>
              Our mission is simple: deliver fresh, clean, and professionally handled laundry to your doorstep. Whether it's everyday clothing, delicate fabrics, or bulky household items, we treat every garment with the same level of care.
            </p>
            <p>
              We offer wash & fold, dry cleaning, ironing & steaming, and pickup & delivery services. Our express wash option returns your laundry in just 4 hours, and our free pickup and delivery service covers the greater Kitengela area.
            </p>
            <div className="about-highlights">
              <div className="about-highlight">
                <h4>Our Process</h4>
                <p>Collect → Sort → Clean → Finish → Deliver</p>
              </div>
              <div className="about-highlight">
                <h4>Service Areas</h4>
                <p>Kitengela, Kisaju, Isinya, Athi River, Mlolongo, Kajiado</p>
              </div>
              <div className="about-highlight">
                <h4>Payment</h4>
                <p>Cash and M-Pesa accepted</p>
              </div>
            </div>
          </div>
          <div className="about-visual">
            <img src="/assets/laundry-machines.jpg" alt="Open Doors Laundromat facility" loading="lazy" />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
