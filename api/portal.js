// api/portal.js — serverless wrapper for /r/:id that injects per-patient Open Graph
// metadata into the SPA shell, so messengers render a rich banner card instead of
// a small square thumbnail. The shell is baked in at build time (api/_shell.mjs).
import { SHELL_HTML } from './_shell.mjs';

export const config = { runtime: 'edge' };

function clean(s, max = 40) {
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
  let t = new Date(consultDate).getTime();
  if (Number.isNaN(t)) t = new Date(`${consultDate}T00:00:00`).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.floor((Date.now() - t) / 86400000) + 1;
  return diff > 0 ? String(diff) : '1';
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

  // Look up the patient via the Supabase REST API (plain fetch — no client deps
  // in the function bundle). Same source the SPA uses.
  let name = '';
  let day = '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey && id) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/patients?select=name,consultDate&id=eq.${encodeURIComponent(id)}`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }, signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const rows = await res.json();
        const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (data) {
          name = clean(data.name || '');
          day = dayFromConsult(data.consultDate);
        }
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

  let html = SHELL_HTML;
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
        .replace(/<meta property="og:image:width"[^>]*\/>/, `<meta property="og:image:width" content="800" />`)
        .replace(/<meta property="og:image:height"[^>]*\/>/, `<meta property="og:image:height" content="418" />`)
        .replace(/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${urlT}" />`);

      return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
      });
    } catch (err) {
      // Fall through to the unmodified shell — never 500 a patient link
    }
  }

  // Safety net: return the unmodified shell with generic meta.
  if (html) {
    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
    });
  }
  return new Response('Portal not found', { status: 404 });
}
