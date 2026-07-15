import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import campmeetLogo from '../assets/campmeet-logo.png';
import ustedLogo from '../assets/usted-logo.png';

const slides = [
  {
    key: 'campmeet',
    logo: campmeetLogo,
    eyebrow: 'Connect · Engage · Elevate',
    title: 'CampMEET',
    body: "Ghana's premier social space for university students — built for real campus life, not just scrolling.",
  },
  {
    key: 'usted',
    logo: ustedLogo,
    eyebrow: 'Built in partnership with',
    title: 'USTED',
    body: 'Verified USTED students get a distinct maroon seal on their profile — proof this is really you, on a platform that knows your campus.',
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 'var(--sp-5)' }}>
        <img
          src={slide.logo}
          alt={slide.title}
          style={{ width: slide.key === 'usted' ? 140 : 200, transition: 'opacity 0.25s ease' }}
        />
        <div>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>{slide.eyebrow}</p>
          <h1 className="h-display" style={{ fontSize: 'var(--fs-2xl)', marginBottom: 'var(--sp-3)' }}>{slide.title}</h1>
          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>{slide.body}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: 'var(--sp-5) 0' }}>
        {slides.map((s, i) => (
          <span
            key={s.key}
            style={{
              width: i === index ? 22 : 8,
              height: 8,
              borderRadius: 999,
              background: i === index ? 'var(--maroon)' : 'var(--line)',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        {!isLast && (
          <button className="btn btn-ghost btn-block" onClick={() => navigate('/login')}>
            Skip
          </button>
        )}
        <button
          className="btn btn-primary btn-block"
          onClick={() => (isLast ? navigate('/login') : setIndex(index + 1))}
        >
          {isLast ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
