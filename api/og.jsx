// api/og.jsx — dynamic 1200x630 Open Graph poster for patient recovery plans.
// Node runtime (most compatible with api/ bundling; still fast for crawlers).
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'nodejs' };

const BG = '#0a1120';
const CYAN = '#00d2ff';
const CYAN_HI = '#5cf2ff';
const WHITE = '#ffffff';
const SUB = '#b8c7d6';

// Strip anything that could break out of text, cap length
function clean(s, max = 20) {
  if (!s) return '';
  return String(s).replace(/[<>&"'`]/g, '').trim().slice(0, max);
}

function buildCopy(nameRaw, dayRaw) {
  const name = clean(nameRaw) || 'Your';
  const day = clean(dayRaw, 3);
  const hasDay = /^\d+$/.test(day);

  const line1 = hasDay
    ? `${name === 'Your' ? '' : `${name}'s `}Day ${day}`.trim()
    : name === 'Your' ? 'Your Personalized' : `${name}'s Personalized`;
  const line2 = 'Recovery Plan';

  const sub = hasDay
    ? `${name === 'Your' ? 'Your' : `${name}'s`} personalized 3D recovery plan, built from your physio consult. Tap to see it.`
    : 'A personalized 3D recovery plan, built from your physio consult. Tap to see yours.';

  const fsize = name.length <= 12 ? 72 : name.length <= 18 ? 62 : 52;
  return { line1, line2, sub, fsize };
}

function Poster({ line1, line2, sub, fsize, gridSrc, bodySrc }) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        position: 'relative',
        backgroundColor: BG,
        overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Grid room texture (subtle) */}
      <img
        src={gridSrc}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.16 }}
      />
      {/* Navy tint + cyan glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(10,17,32,0.94) 0%, rgba(10,17,32,0.72) 45%, rgba(0,210,255,0.10) 100%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '52px',
          padding: '64px 72px',
          width: '100%',
          height: '100%',
        }}
      >
        {/* LEFT — brand, headline, CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, gap: '22px' }}>
          {/* Brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', width: '46px', height: '46px' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '32px',
                  height: '32px',
                  border: '3px solid',
                  borderColor: CYAN_HI,
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '32px',
                  height: '32px',
                  border: '3px solid',
                  borderColor: CYAN_HI,
                  borderRadius: '4px',
                  backgroundColor: 'rgba(0,229,255,0.15)',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '21px', fontWeight: 800, letterSpacing: '6px', color: '#7fd8ff' }}>THE SLEEP</div>
              <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '7px', color: 'rgba(127,216,255,0.8)' }}>
                COMPANY
              </div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
            <div style={{ fontSize: `${fsize}px`, fontWeight: 800, lineHeight: 1.02, color: WHITE }}>{line1}</div>
            <div style={{ fontSize: `${fsize}px`, fontWeight: 800, lineHeight: 1.02, color: CYAN_HI }}>{line2}</div>
          </div>

          {/* Subline */}
          <div style={{ fontSize: '26px', fontWeight: 500, color: SUB, lineHeight: 1.35, maxWidth: '600px' }}>{sub}</div>

          {/* CTA chip baked into the image */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '10px',
              alignSelf: 'flex-start',
              padding: '16px 30px',
              border: '3px solid',
              borderColor: CYAN,
              borderRadius: '999px',
              backgroundColor: 'rgba(0,210,255,0.12)',
              boxShadow: '0 0 40px rgba(0,210,255,0.30)',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 800, color: WHITE, letterSpacing: '1px' }}>Tap to View</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: CYAN_HI }}>→</div>
          </div>
        </div>

        {/* RIGHT — anatomy figure in a glowing panel */}
        <div
          style={{
            position: 'relative',
            width: '440px',
            height: '440px',
            flexShrink: 0,
            borderRadius: '26px',
            border: '2px solid rgba(0,210,255,0.45)',
            overflow: 'hidden',
            boxShadow: '0 0 70px rgba(0,210,255,0.28)',
          }}
        >
          <img src={bodySrc} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(10,17,32,0.05) 55%, rgba(10,17,32,0.45) 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// No-external-assets fallback so the route can never fail outright
function FallbackPoster({ line1, line2, sub, fsize }) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        backgroundColor: BG,
        fontFamily: 'sans-serif',
        background:
          'linear-gradient(135deg, rgba(10,17,32,0.95) 0%, rgba(10,17,32,0.8) 50%, rgba(0,210,255,0.12) 100%)',
      }}
    >
      <div style={{ fontSize: '21px', fontWeight: 800, letterSpacing: '6px', color: '#7fd8ff' }}>THE SLEEP COMPANY</div>
      <div style={{ fontSize: `${fsize}px`, fontWeight: 800, lineHeight: 1.05, color: WHITE, marginTop: '28px' }}>
        {line1}
      </div>
      <div style={{ fontSize: `${fsize}px`, fontWeight: 800, lineHeight: 1.05, color: CYAN_HI }}>{line2}</div>
      <div style={{ fontSize: '26px', fontWeight: 500, color: SUB, lineHeight: 1.4, marginTop: '22px', maxWidth: '760px' }}>
        {sub}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '34px',
          alignSelf: 'flex-start',
          padding: '16px 30px',
          border: '3px solid',
          borderColor: CYAN,
          borderRadius: '999px',
          backgroundColor: 'rgba(0,210,255,0.12)',
        }}
      >
        <div style={{ fontSize: '28px', fontWeight: 800, color: WHITE, letterSpacing: '1px' }}>Tap to View</div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: CYAN_HI }}>→</div>
      </div>
    </div>
  );
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const origin = new URL(req.url).origin;
  const { line1, line2, sub, fsize } = buildCopy(searchParams.get('name'), searchParams.get('day'));

  let res;
  try {
    res = new ImageResponse(
      <Poster
        line1={line1}
        line2={line2}
        sub={sub}
        fsize={fsize}
        gridSrc={`${origin}/grid_background.jpg`}
        bodySrc={`${origin}/3d_preview.png`}
      />,
      { width: 1200, height: 630 }
    );
  } catch (e) {
    res = new ImageResponse(
      <FallbackPoster line1={line1} line2={line2} sub={sub} fsize={fsize} />,
      { width: 1200, height: 630 }
    );
  }

  // Cache per-URL (each ?v= is a distinct URL, so per-send cache-busting still works)
  res.headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
  return res;
}
