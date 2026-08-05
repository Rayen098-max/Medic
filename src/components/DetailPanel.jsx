import React from 'react';
import { X, CheckCircle2, XCircle, ShoppingBag } from 'lucide-react';
import productsCatalog from '../data/products.json';

export default function DetailPanel({ zone, onClose }) {
  if (!zone) return null;

  return (
    <div 
      className="glass-panel" 
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        bottom: '20px',
        width: '100%',
        maxWidth: '400px',
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        zIndex: 10,
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--accent)' }}>{zone.name}</h2>
        <button 
          onClick={onClose}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            padding: '4px' 
          }}
        >
          <X size={24} />
        </button>
      </div>

      <div>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Physiotherapist Note</h3>
        <p style={{ color: 'var(--text-main)', margin: 0, lineHeight: 1.6 }}>
          {zone.description}
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#22c55e', margin: '0 0 12px 0' }}>
            <CheckCircle2 size={18} /> Recommended
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {zone.dos.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#ef4444', margin: '0 0 12px 0' }}>
            <XCircle size={18} /> To Avoid
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {zone.donts.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 'auto', background: 'rgba(0, 210, 255, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--accent)', margin: '0 0 12px 0' }}>
          <ShoppingBag size={18} /> Priority Sleep Company Solutions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {zone.products.map((p, i) => {
            const catProd = productsCatalog.find(c => c.id === p.id);
            if (!catProd) return null;
            return (
              <div key={i} style={{ display: 'flex', gap: '12px', background: 'rgba(13, 17, 23, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                <img src={catProd.image} alt={catProd.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: 'white' }}>{catProd.name}</h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.reason}</p>
                  <a 
                    href={catProd.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="clinical-btn"
                    style={{ display: 'inline-flex', padding: '4px 12px', fontSize: '0.8rem', textDecoration: 'none' }}
                  >
                    View on Store
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 768px) {
          .glass-panel {
            maxWidth: 100% !important;
            border-radius: 24px 24px 0 0 !important;
            top: auto !important;
            height: 60vh !important;
            border-bottom: none !important;
            border-left: none !important;
            border-right: none !important;
            animation: slideUp 0.3s ease-out !important;
          }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
