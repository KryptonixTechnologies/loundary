import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock, MapPin, Phone, Zap, Shield, Truck, RefreshCw, Star, Check, MessageCircle } from 'lucide-react';
import { MarketingLayout, services, processSteps, business } from './MarketingLayout.jsx';

const reviews = [
  { name: 'Jane W.', text: 'Excellent service! My clothes come back perfectly clean every time. Highly recommend.', rating: 5 },
  { name: 'Peter M.', text: 'Fast pickup and delivery. The quality is outstanding. Will definitely use again.', rating: 5 },
  { name: 'Sarah K.', text: 'Great prices and professional care. The express 4-hour wash is a lifesaver.', rating: 5 },
  { name: 'David R.', text: 'Best laundromat in Kitengela. Always fresh and neatly folded.', rating: 5 },
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": business.name,
  "description": "Premium laundry and garment care in Kitengela, Kisaju, Isinya and Athi River.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Chuna Mall, Ground Floor, Shop 10",
    "addressLocality": "Kitengela",
    "addressCountry": "KE"
  },
  "telephone": business.phone,
  "url": "https://open-doors-laundory.vercel.app/",
  "email": business.email,
  "sameAs": [business.whatsapp],
  "openingHours": [
    "Mo-Sa 08:00-21:00",
    "Su 14:00-19:00"
  ],
  "serviceType": ["Wash & Fold", "Dry Cleaning", "Ironing", "Pickup & Delivery"],
  "areaServed": ["Kitengela", "Kisaju", "Isinya", "Athi River", "Mlolongo", "Kajiado"],
  "paymentAccepted": ["Cash", "M-Pesa"],
  "images": ["/assets/laundry-machines.jpg"]
};

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <MarketingLayout>
      <Helmet>
        <title>Open Doors Laundromat | So Fresh, So Clean, So You</title>
        <meta name="description" content="Premium laundry and garment care in Kitengela, Kisaju, Isinya and Athi River. Wash & fold, dry cleaning, ironing, and pickup & delivery." />
        <link rel="canonical" href="/" />
        <meta property="og:title" content="Open Doors Laundromat | So Fresh, So Clean, So You" />
        <meta property="og:description" content="Premium laundry and garment care in Kitengela, Kisaju, Isinya and Athi River." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://open-doors-laundory.vercel.app/" />
        <meta property="og:image" content="/assets/logo.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Open Doors Laundromat | So Fresh, So Clean, So You" />
        <meta name="twitter:description" content="Premium laundry and garment care in Kitengela, Kisaju, Isinya and Athi River." />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Laundry service in Kitengela</p>
          <h1>So fresh, so clean, so you.</h1>
          <p>Professional wash & fold, dry cleaning, ironing, and pickup & delivery. Express wash in just 4 hours.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate('/booking')}>
              Book a pickup <ArrowUpRight size={18} />
            </button>
            <button className="btn-secondary" onClick={() => navigate('/services')}>
              View services
            </button>
          </div>
          <div className="hero-trust">
            <div className="trust-item"><Check size={16} /> Free pickup & delivery</div>
            <div className="trust-item"><Clock size={16} /> Express 4-hour wash</div>
            <div className="trust-item"><Shield size={16} /> Quality guaranteed</div>
          </div>
        </div>
        <div className="hero-visual">
          <img src="/assets/laundry-machines.jpg" alt="Open Doors Laundromat washing machines" loading="eager" />
          <div className="hero-badge">
            <Zap size={20} />
            <span>Express wash in 4 hours</span>
          </div>
        </div>
      </section>

      <section className="services-section" id="services">
        <div className="section-head">
          <div>
            <p className="eyebrow">What we do</p>
            <h2>Our services.</h2>
          </div>
          <p>From everyday laundry to delicate dry cleaning, we handle it all with care.</p>
        </div>
        <div className="services-grid">
          {services.map((service) => (
            <article key={service.name} className="service-card">
              <span className="service-icon">{service.icon}</span>
              <h3>{service.name}</h3>
              <p>{service.desc}</p>
              <span className="service-price">{service.price}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="process-section" id="process">
        <div className="section-head">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Simple as 1-2-3.</h2>
          </div>
          <p>From drop-off to delivery, our process keeps your laundry moving.</p>
        </div>
        <div className="process-steps">
          {processSteps.map((step, i) => (
            <div key={step.step} className="process-step">
              <div className="process-step-num">{step.step}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              {i < processSteps.length - 1 && <div className="process-arrow"><ArrowUpRight size={20} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="location-section" id="location">
        <div className="section-head">
          <div>
            <p className="eyebrow">Visit us</p>
            <h2>Find us.</h2>
          </div>
          <p>Drop off your laundry or schedule a pickup from anywhere in the greater Kitengela area.</p>
        </div>
        <div className="location-grid">
          <div className="location-card">
            <h3>Chuna Mall, Kitengela</h3>
            <p><MapPin size={16} /> Ground Floor, Shop 10, Chuna Mall, Kitengela, Kenya</p>
            <p><Phone size={16} /> {business.phone}</p>
            <p><Clock size={16} /> Mon–Sat: 8am–9pm</p>
            <p><Clock size={16} /> Sun: 2pm–7pm</p>
            <a className="btn-secondary" href={business.whatsapp} target="_blank" rel="noopener noreferrer">
              WhatsApp us <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="location-map">
            <img src="/assets/laundry-machines.jpg" alt="Open Doors Laundromat location" loading="lazy" />
            <div className="location-overlay">
              <p>Serving Kitengela, Kisaju, Isinya, Athi River, Mlolongo & Kajiado</p>
            </div>
          </div>
        </div>
      </section>

      <section className="reviews-section" id="reviews">
        <div className="section-head">
          <div>
            <p className="eyebrow">What our customers say</p>
            <h2>Happy clients.</h2>
          </div>
          <p>Trusted by hundreds of households and businesses across the greater Kitengela area.</p>
        </div>
        <div className="reviews-grid">
          {reviews.map((review, i) => (
            <div key={i} className="review-card">
              <div className="review-stars">
                {Array.from({ length: review.rating }, (_, j) => <Star key={j} size={16} />)}
              </div>
              <p className="review-text">"{review.text}"</p>
              <span className="review-name">— {review.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready for a fresh start?</h2>
          <p>Book your pickup today and experience the Open Doors difference.</p>
          <button className="btn-primary" onClick={() => navigate('/booking')}>
            Book a pickup <ArrowUpRight size={18} />
          </button>
        </div>
      </section>
    </MarketingLayout>
  );
}
