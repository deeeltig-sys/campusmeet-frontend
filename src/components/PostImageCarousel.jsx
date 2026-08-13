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

// Was a one-at-a-time swipe carousel for every multi-image post,
// including 2- and 3-photo posts where swiping to see the rest meant
// most people never saw past the first frame. Replaced with a tiled
// grid (2/3/4-up, "+N" overlay past 4) — same tap-to-zoom, long-press,
// and double-tap-to-like gestures per tile, just laid out at once
// instead of hidden behind a swipe. See .post-image-grid* in
// global.css for the layout rules.
export default function PostImageCarousel({ images, onImageTap, onPressStart, onPressEnd, showHeartBurst }) {
  const shown = images.slice(0, 4);
  const extra = images.length - 4;

  return (
    <div style={{ position: 'relative' }}>
      <div className={`post-image-grid post-image-grid-${shown.length}`}>
        {shown.map((img, i) => {
          const url = resolveUrl(img);
          const isOverlayTile = i === 3 && extra > 0;
          return (
            <button
              key={url || i}
              type="button"
              className="post-image-grid-tile"
              onClick={() => url && onImageTap?.(url)}
              onPointerDown={onPressStart}
              onPointerUp={onPressEnd}
              onPointerLeave={onPressEnd}
              onPointerCancel={onPressEnd}
              aria-label={isOverlayTile ? `View all ${images.length} photos` : `Open photo ${i + 1}`}
            >
              <img src={url} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
              {isOverlayTile && (
                <span className="post-image-grid-overlay">+{extra}</span>
              )}
            </button>
          );
        })}
      </div>

      {showHeartBurst && (
        <span className="heart-burst" aria-hidden="true">❤️</span>
      )}
    </div>
  );
}
