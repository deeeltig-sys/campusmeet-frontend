import { useRef, useState } from 'react';

export default function PostImageCarousel({ images, onImageTap }) {
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.min(images.length - 1, Math.max(0, index)));
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch', borderRadius: 'var(--radius-md)',
        }}
      >
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => onImageTap?.(img.url)}
            style={{
              flex: '0 0 100%', scrollSnapAlign: 'start', border: 'none', padding: 0,
              cursor: 'zoom-in', display: 'block', width: '100%',
            }}
          >
            <img className="post-image" src={img.url} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
          </button>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <div style={{
            position: 'absolute', top: 8, right: 10, background: 'rgba(0,0,0,0.55)', color: '#fff',
            fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, fontFamily: 'var(--font-mono)',
          }}>
            {activeIndex + 1}/{images.length}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 6 }}>
            {images.map((img, i) => (
              <span
                key={img.url}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: i === activeIndex ? 'var(--maroon)' : 'var(--line)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
