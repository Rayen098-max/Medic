// api/portal.js — serverless wrapper for /r/:id that injects per-patient Open Graph
// metadata into the SPA shell, so messengers render a rich banner card instead of
// a small square thumbnail. Node runtime (reads the built shell + Supabase lookup).
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

function clean(s, max = 30) {
  if (!s) return '';
  return String(s).replace(/[<>&"'`]/g, '').trim().slice(0, max);
}

// Escape for HTML attribute context
function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Recovery day = days since consult (consult day = Day 1)
function dayFromConsult(consultDate) {
  if (!consultDate) return '';
  const t = new Date(`${consultDate}T00:00:00`).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.floor((Date.now() - t) / 86400000) + 1;
  return diff > 0 ? String(diff) : '1';
}

function readShell(origin) {
  // 1) Bundled via vercel.json includeFiles (fastest)
  for (const p of [`${process.cwd()}/dist/index.html`, `${process.cwd()}/../dist/index.html`]) {
    try {
      const s = fs.readFileSync(p, 'utf8');
      if (s) return s;
    } catch (e) {
      /* try next */
    }
  }
  return null;
}

async function fetchShell(origin) {
  // 2) Same-origin static shell (always present on Vercel)
  try {
    const res = await fetch(`${origin}/index.html`);
    if (res.ok) return await res.text();
  } catch (e) {
    /* ignore */
  }
  return null;
}

export default async function handler(req) {
  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    url = new URL('https://medic-tau.vercel.app/');
  }

  const id = clean(url.searchParams.get('id') || '');
  const v = clean(url.searchParams.get('v') || '');

  // Look up the patient from the same Supabase source the SPA uses.
  let name = '';
  let day = '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey && id) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.from('patients').select('name, consultDate').eq('id', id).single();
      if (data) {
        name = clean(data.name || '');
        day = dayFromConsult(data.consultDate);
      }
    } catch (err) {
      // No patient / DB issue -> fall through to generic tags
    }
  }

  const person = name ? `${name}'s` : 'Your';
  const title = day ? `${person} Recovery Plan — Day ${day}` : `${person} Personalized Recovery Plan`;
  const desc = day
    ? `${person} personalized 3D recovery plan — Day ${day}. Tap to view.`
    : `${person} personalized interactive 3D recovery plan. Tap to view.`;

  // og:image points at the dynamic poster route; ?v= passes through so each
  // WhatsApp send (with its own ?v=timestamp) cache-busts the preview.
  const imgQuery = new URLSearchParams();
  if (name) imgQuery.set('name', name);
  if (day) imgQuery.set('day', day);
  if (v) imgQuery.set('v', v);
  const ogImage = `${url.origin}/api/og${imgQuery.size ? '?' + imgQuery.toString() : ''}`;
  const ogUrl = `${url.origin}/r/${id}${v ? '?v=' + v : ''}`;

  // Read the built SPA shell, then inject the dynamic meta.
  let html = readShell(url.origin);
  if (!html) html = await fetchShell(url.origin);

  if (html) {
    try {
      const titleT = escAttr(title);
      const descT = escAttr(desc);
      const imgT = escAttr(ogImage);
      const urlT = escAttr(ogUrl);

      html = html
        .replace(/<title>[^<]*<\/title>/, `<title>${titleT}</title>`)
        .replace(/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${titleT}" />`)
        .replace(/<meta property="og:description"[^>]*\/>/, `<meta property="og:description" content="${descT}" />`)
        .replace(/<meta property="og:image"[^>]*\/>/, `<meta property="og:image" content="${imgT}" />`)
        .replace(/<meta property="og:image:width"[^>]*\/>/, `<meta property="og:image:width" content="1200" />`)
        .replace(/<meta property="og:image:height"[^>]*\/>/, `<meta property="og:image:height" content="630" />`)
        .replace(/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${urlT}" />`);

      return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
      });
    } catch (err) {
      // Fall through to the unmodified shell — never 500 a patient link
    }
  }

  // Safety net: return the plain shell (generic meta) if anything above failed.
  if (!html) html = await fetchShell(url.origin);
  if (html) {
    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
    });
  }
  return new Response('Portal not found', { status: 404 });
}
