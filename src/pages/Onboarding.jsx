import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import campmeetLogo from '../assets/campmeet-logo.png';
import GoldSparkle from '../components/GoldSparkle';

const slides = [
  {
    key: 'campmeet',
    eyebrow: 'Connect · Engage · Elevate',
    title: 'CampusMEET',
    body: "Ghana's premier social space for university students — built for real campus life, not just scrolling.",
  },
  {
    key: 'verified',
    eyebrow: 'Real students, real campuses',
    title: 'Get verified',
    body: 'Verified students get a distinct maroon seal on their profile — proof this is really you, on a platform that knows your campus.',
  },
];

const ONBOARDED_KEY = 'campmeet_onboarded';

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const isSeal = slide.key === 'verified';

  function finishOnboarding() {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    navigate('/login');
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 'var(--sp-5)' }}>
        <div style={{ position: 'relative', width: isSeal ? 140 : 200, height: isSeal ? 140 : 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isSeal ? (
            <>
              <GoldSparkle count={4} />
              <svg width="120" height="120" viewBox="0 0 24 24" style={{ position: 'relative', zIndex: 1 }}>
                <circle cx="12" cy="12" r="11" fill="var(--maroon-light)" stroke="var(--gold)" strokeWidth="1.2" />
                <path
                  d="M8 12.5l2.6 2.6L16.5 9"
                  fill="none" stroke="var(--maroon-deep)" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </>
          ) : (
            <img src={campmeetLogo} alt={slide.title} style={{ width: 200, transition: 'opacity 0.25s ease' }} />
          )}
        </div>
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
          <button className="btn btn-ghost btn-block" onClick={finishOnboarding}>
            Skip
          </button>
        )}
        <button
          className="btn btn-primary btn-block"
          onClick={() => (isLast ? finishOnboarding() : setIndex(index + 1))}
        >
          {isLast ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
