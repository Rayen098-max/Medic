// api/og.js — dynamic 1200x630 Open Graph poster for patient recovery plans.
// Plain JS (no JSX) + Node runtime for maximum compatibility with api/ bundling.
import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';

export const config = { runtime: 'edge' };

const BG = '#0a1120';
const CYAN = '#00d2ff';
const CYAN_HI = '#5cf2ff';
const WHITE = '#ffffff';
const SUB = '#b8c7d6';

function clean(s, max = 20) {
  if (!s) return '';
  return String(s).replace(/[<>&"'`]/g, '').trim().slice(0, max);
}

function buildCopy(nameRaw) {
  const name = clean(nameRaw) || 'Your';

  const line1 = name === 'Your' ? 'Your Personalized' : `${name}'s Personalized`;
  const line2 = 'Recovery Plan';

  const sub = 'A personalized 3D recovery plan, built from your physio consult. Tap to see yours.';

  const fsize = name.length <= 12 ? 72 : name.length <= 18 ? 62 : 52;
  return { line1, line2, sub, fsize };
}

function Poster({ line1, line2, sub, fsize, bodySrc }) {
  const scaledFsize = Math.min(fsize, 38);

  return h(
    'div',
    {
      style: {
        width: '800px', height: '418px', display: 'flex', position: 'relative',
        backgroundColor: BG, overflow: 'hidden', fontFamily: 'sans-serif',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(10,17,32,0.96) 0%, rgba(10,17,32,0.85) 50%, rgba(0,210,255,0.15) 100%)',
      },
    },
    [
      // The Safe Zone (418x418 center square)
      h(
        'div',
        {
          key: 'safe-zone',
          style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '418px', height: '418px', gap: '16px', textAlign: 'center',
          },
        },
        [
          // Brand Mark
          h('div', { key: 'brand', style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            h('div', { key: 'icon', style: { display: 'flex', position: 'relative', width: '28px', height: '28px' } }, [
              h('div', {
                key: 's1',
                style: { position: 'absolute', top: 0, left: 0, width: '18px', height: '18px', border: '2px solid', borderColor: CYAN_HI, borderRadius: '4px' },
              }),
              h('div', {
                key: 's2',
                style: { position: 'absolute', bottom: 0, right: 0, width: '18px', height: '18px', border: '2px solid', borderColor: CYAN_HI, borderRadius: '4px', backgroundColor: 'rgba(0,229,255,0.15)' },
              }),
            ]),
            h('div', { key: 'text', style: { display: 'flex', flexDirection: 'column', textAlign: 'left' } }, [
              h('div', { key: 'b1', style: { fontSize: '13px', fontWeight: 800, letterSpacing: '4px', color: '#7fd8ff', lineHeight: 1 } }, 'THE SLEEP'),
              h('div', { key: 'b2', style: { fontSize: '9px', fontWeight: 600, letterSpacing: '5px', color: 'rgba(127,216,255,0.8)', lineHeight: 1, marginTop: '2px' } }, 'COMPANY'),
            ]),
          ]),
          // Headline
          h('div', { key: 'head', style: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', alignItems: 'center' } }, [
            h('div', { key: 'l1', style: { fontSize: `${scaledFsize}px`, fontWeight: 800, lineHeight: 1.1, color: WHITE, textAlign: 'center' } }, line1),
            h('div', { key: 'l2', style: { fontSize: `${scaledFsize}px`, fontWeight: 800, lineHeight: 1.1, color: CYAN_HI, textAlign: 'center' } }, line2),
          ]),
          // 3D Figure Panel (Centered)
          h('div', {
            key: 'figure',
            style: {
              display: 'flex', position: 'relative', width: '160px', height: '160px', flexShrink: 0, borderRadius: '16px',
              border: '2px solid rgba(0,210,255,0.45)', overflow: 'hidden', boxShadow: '0 0 30px rgba(0,210,255,0.28)',
              marginTop: '8px'
            },
          }, [
            h('img', { key: 'img', src: bodySrc, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } }),
            h('div', {
              key: 'fade',
              style: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,17,32,0.05) 55%, rgba(10,17,32,0.45) 100%)' },
            }),
          ]),
          // Subline (tiny context text)
          h('div', { key: 'sub', style: { fontSize: '14px', fontWeight: 500, color: SUB, lineHeight: 1.35, textAlign: 'center', padding: '0 20px', marginTop: '4px' } }, sub),
        ]
      ),
    ]
  );
}

function FallbackPoster({ line1, line2, sub, fsize }) {
  const scaledFsize = Math.min(fsize, 42);
  return h('div', {
    style: {
      width: '800px', height: '418px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px', backgroundColor: BG, fontFamily: 'sans-serif',
      background: 'linear-gradient(135deg, rgba(10,17,32,0.95) 0%, rgba(10,17,32,0.8) 50%, rgba(0,210,255,0.12) 100%)',
    },
  }, [
    h('div', { key: 'top', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' } }, [
      h('div', { key: 'brand', style: { fontSize: '16px', fontWeight: 800, letterSpacing: '4px', color: '#7fd8ff' } }, 'THE SLEEP COMPANY'),
      h('div', { key: 'l1', style: { fontSize: `${scaledFsize}px`, fontWeight: 800, lineHeight: 1.1, color: WHITE, marginTop: '16px' } }, line1),
      h('div', { key: 'l2', style: { fontSize: `${scaledFsize}px`, fontWeight: 800, lineHeight: 1.1, color: CYAN_HI } }, line2),
      h('div', { key: 'sub', style: { fontSize: '20px', fontWeight: 500, color: SUB, lineHeight: 1.35, marginTop: '12px' } }, sub),
    ]),
  ]);
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const origin = new URL(req.url).origin;
  const copy = buildCopy(searchParams.get('name'));

  let res;
  try {
    res = new ImageResponse(
      h(Poster, {
        ...copy,
        gridSrc: `${origin}/grid_background.jpg`,
        bodySrc: `${origin}/3d_preview.png`,
      }),
      { width: 800, height: 418 }
    );
  } catch (e) {
    res = new ImageResponse(h(FallbackPoster, copy), { width: 800, height: 418 });
  }

  // Cache per-URL (each ?v= is a distinct URL, so per-send cache-busting still works)
  res.headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
  return res;
}
