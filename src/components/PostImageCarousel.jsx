import { useRef, useState } from 'react';

// The backend's images array (routes/posts.py _attach_post_images) is
// a plain array of URL strings: ["https://...", "https://..."]. This
// component was reading img.url on each entry — a string has no .url
// property, so every src and every React key came out undefined for
// every multi-image post, silently. Handling both shapes defensively
// (plain string, or an {url} object) so this can't regress the same
// way again if something upstream ever sends objects instead.
function resolveUrl(img) {
  return typeof img === 'string' ? img : img?.url;
}

export default function PostImageCarousel({ images, onImageTap, onPressStart, onPressEnd, showHeartBurst }) {
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
        {images.map((img, i) => {
          const url = resolveUrl(img);
          return (
            <button
              key={url || i}
              type="button"
              onClick={() => url && onImageTap?.(url)}
              onPointerDown={onPressStart}
              onPointerUp={onPressEnd}
              onPointerLeave={onPressEnd}
              onPointerCancel={onPressEnd}
              style={{
                flex: '0 0 100%', scrollSnapAlign: 'start', border: 'none', padding: 0,
                cursor: 'zoom-in', display: 'block', width: '100%',
              }}
            >
              <img className="post-image" src={url} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            </button>
          );
        })}
      </div>

      {showHeartBurst && (
        <span className="heart-burst" aria-hidden="true">❤️</span>
      )}

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
                key={resolveUrl(img) || i}
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
