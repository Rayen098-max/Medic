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

function Poster({ line1, line2, sub, fsize, bodySrc }) {
  const scaledFsize = Math.min(fsize, 42);

  return h(
    'div',
    {
      style: {
        width: '600px', height: '600px', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', backgroundColor: BG, overflow: 'hidden',
        fontFamily: 'sans-serif', padding: '40px', position: 'relative',
        background: 'linear-gradient(135deg, rgba(10,17,32,0.96) 0%, rgba(10,17,32,0.85) 50%, rgba(0,210,255,0.15) 100%)',
      },
    },
    [
      // TOP CONTENT
      h('div', { key: 'top', style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, [
        // Brand Mark
        h('div', { key: 'brand', style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          h('div', { key: 'icon', style: { display: 'flex', position: 'relative', width: '36px', height: '36px' } }, [
            h('div', {
              key: 's1',
              style: { position: 'absolute', top: 0, left: 0, width: '24px', height: '24px', border: '3px solid', borderColor: CYAN_HI, borderRadius: '4px' },
            }),
            h('div', {
              key: 's2',
              style: { position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', border: '3px solid', borderColor: CYAN_HI, borderRadius: '4px', backgroundColor: 'rgba(0,229,255,0.15)' },
            }),
          ]),
          h('div', { key: 'text', style: { display: 'flex', flexDirection: 'column' } }, [
            h('div', { key: 'b1', style: { fontSize: '16px', fontWeight: 800, letterSpacing: '4px', color: '#7fd8ff' } }, 'THE SLEEP'),
            h('div', { key: 'b2', style: { fontSize: '11px', fontWeight: 600, letterSpacing: '5px', color: 'rgba(127,216,255,0.8)' } }, 'COMPANY'),
          ]),
        ]),
        // Headline
        h('div', { key: 'head', style: { display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '10px' } }, [
          h('div', { key: 'l1', style: { fontSize: `${scaledFsize}px`, fontWeight: 800, lineHeight: 1.1, color: WHITE } }, line1),
          h('div', { key: 'l2', style: { fontSize: `${scaledFsize}px`, fontWeight: 800, lineHeight: 1.1, color: CYAN_HI } }, line2),
        ]),
        // Subline
        h('div', { key: 'sub', style: { fontSize: '20px', fontWeight: 500, color: SUB, lineHeight: 1.35 } }, sub),
      ]),

      // BOTTOM CONTENT ROW (CTA + 3D Figure Panel)
      h('div', { key: 'bottom', style: { display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '20px' } }, [
        // CTA Chip
        h('div', {
          key: 'cta',
          style: {
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 24px', border: '2px solid', borderColor: CYAN, borderRadius: '999px',
            backgroundColor: 'rgba(0,210,255,0.12)', boxShadow: '0 0 30px rgba(0,210,255,0.25)',
          },
        }, [
          h('div', { key: 't', style: { fontSize: '20px', fontWeight: 800, color: WHITE, letterSpacing: '1px' } }, 'Tap to View'),
          h('div', { key: 'a', style: { fontSize: '20px', fontWeight: 800, color: CYAN_HI } }, '→'),
        ]),

        // 3D Figure Panel
        h('div', {
          key: 'figure',
          style: {
            display: 'flex', position: 'relative', width: '180px', height: '180px', flexShrink: 0, borderRadius: '18px',
            border: '2px solid rgba(0,210,255,0.45)', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,210,255,0.28)',
          },
        }, [
          h('img', { key: 'img', src: bodySrc, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } }),
          h('div', {
            key: 'fade',
            style: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,17,32,0.05) 55%, rgba(10,17,32,0.45) 100%)' },
          }),
        ]),
      ]),
    ]
  );
}

function FallbackPoster({ line1, line2, sub, fsize }) {
  const scaledFsize = Math.min(fsize, 42);
  return h('div', {
    style: {
      width: '600px', height: '600px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '40px', backgroundColor: BG, fontFamily: 'sans-serif',
      background: 'linear-gradient(135deg, rgba(10,17,32,0.95) 0%, rgba(10,17,32,0.8) 50%, rgba(0,210,255,0.12) 100%)',
    },
  }, [
    h('div', { key: 'top', style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, [
      h('div', { key: 'brand', style: { fontSize: '16px', fontWeight: 800, letterSpacing: '4px', color: '#7fd8ff' } }, 'THE SLEEP COMPANY'),
      h('div', { key: 'l1', style: { fontSize: `${scaledFsize}px`, fontWeight: 800, lineHeight: 1.1, color: WHITE, marginTop: '16px' } }, line1),
      h('div', { key: 'l2', style: { fontSize: `${scaledFsize}px`, fontWeight: 800, lineHeight: 1.1, color: CYAN_HI } }, line2),
      h('div', { key: 'sub', style: { fontSize: '20px', fontWeight: 500, color: SUB, lineHeight: 1.35, marginTop: '12px' } }, sub),
    ]),
    h('div', {
      key: 'cta',
      style: {
        display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'flex-start',
        padding: '12px 24px', border: '2px solid', borderColor: CYAN, borderRadius: '999px',
        backgroundColor: 'rgba(0,210,255,0.12)',
      },
    }, [
      h('div', { key: 't', style: { fontSize: '20px', fontWeight: 800, color: WHITE, letterSpacing: '1px' } }, 'Tap to View'),
      h('div', { key: 'a', style: { fontSize: '20px', fontWeight: 800, color: CYAN_HI } }, '→'),
    ]),
  ]);
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const origin = new URL(req.url).origin;
  const copy = buildCopy(searchParams.get('name'), searchParams.get('day'));

  let res;
  try {
    res = new ImageResponse(
      h(Poster, {
        ...copy,
        gridSrc: `${origin}/grid_background.jpg`,
        bodySrc: `${origin}/3d_preview.png`,
      }),
      { width: 600, height: 600 }
    );
  } catch (e) {
    res = new ImageResponse(h(FallbackPoster, copy), { width: 600, height: 600 });
  }

  // Cache per-URL (each ?v= is a distinct URL, so per-send cache-busting still works)
  res.headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
  return res;
}
