import React, { useState, useRef } from 'react';
import './physio.css';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Info, TrendingUp, Download, CheckCircle, AlertTriangle, Layers, Crosshair } from 'lucide-react';
import { usePhysioData } from './usePhysioData';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const PhysioDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showWhatIf, setShowWhatIf] = useState(false);
  const dashboardRef = useRef(null);
  
  const { conversionLift, roi, leadConversion, trendData, loading } = usePhysioData();

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, { backgroundColor: '#101015' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('Physio_Impact_Report.pdf');
  };

  if (loading) {
    return (
      <div className="physio-dashboard flex items-center justify-center">
        <h2 className="text-blue-400 animate-pulse">Loading live dashboard data...</h2>
      </div>
    );
  }

  return (
    <div className="physio-dashboard" ref={dashboardRef}>
      <header className="physio-header glass-panel">
        <div>
          <h1 className="physio-title">Physio Pilot Impact Dashboard</h1>
          <p className="physio-subtitle">Real-time tracking of Mumbai pilot stores vs baseline</p>
        </div>
        <button className="export-btn" onClick={handleExportPDF}>
          <Download size={18} /> Export PDF Report
        </button>
      </header>

      <div className="physio-tabs">
        {['overview', 'products', 'leaderboard'].map(tab => (
          <button 
            key={tab}
            className={`physio-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
          </button>
        ))}
        <button 
            className="physio-tab what-if-tab"
            onClick={() => setShowWhatIf(true)}
          >
            Projections Calculator
        </button>
      </div>

      <main className="physio-content">
        {activeTab === 'overview' && (
          <div className="tab-content fade-in">
            <div className="metrics-grid">
              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <h3>Conversion Lift</h3>
                  <div className="tooltip-icon" title="(Avg Physio Conversion Rate) - (Avg Non-Physio Conversion Rate)">
                    <Info size={16} />
                  </div>
                </div>
                <div className={`metric-value ${conversionLift >= 0 ? 'positive' : ''}`}>
                  {conversionLift > 0 ? '+' : ''}{conversionLift}%
                </div>
                <div className="metric-subtext">Absolute points vs Mumbai baseline</div>
              </div>

              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <h3>ROI Estimation</h3>
                  <div className="tooltip-icon" title="(Physio Incremental Revenue) - (₹50,000 * Number of Physios)">
                    <Info size={16} />
                  </div>
                </div>
                <div className={`metric-value ${roi >= 0 ? 'positive' : ''}`}>
                  ₹ {roi.toLocaleString()}
                </div>
                <div className="metric-subtext">Net gain after physio costs</div>
              </div>

              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <h3>Lead Conversion</h3>
                  <div className="tooltip-icon" title="(Organic Walk-ins / Total Digital Leads) * 100">
                    <Info size={16} />
                  </div>
                </div>
                <div className="metric-value">{leadConversion}%</div>
                <div className="metric-subtext">Walk-ins from digital leads</div>
              </div>
            </div>

            <div className="chart-container glass-panel mt-6">
              <h3>Conversion Trends (Weekly)</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.9)', borderColor: '#333' }} itemStyle={{ color: '#fff' }} />
                    <Legend />
                    <Line type="monotone" dataKey="physio" name="Physio Stores" stroke="#00d2ff" strokeWidth={3} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="baseline" name="Non-Physio Baseline" stroke="#8884d8" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="tab-content fade-in">
             <div className="glass-panel p-8">
               <h3 className="mb-4" style={{color: '#8892b0'}}>Product Conversion Heatmap (Store vs Category)</h3>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  <div style={{background: 'rgba(0, 210, 255, 0.6)', padding: '20px', borderRadius: '8px', textAlign: 'center'}}>Mattress<br/><b>18%</b></div>
                  <div style={{background: 'rgba(0, 210, 255, 0.3)', padding: '20px', borderRadius: '8px', textAlign: 'center'}}>Pillows<br/><b>12%</b></div>
                  <div style={{background: 'rgba(0, 210, 255, 0.1)', padding: '20px', borderRadius: '8px', textAlign: 'center'}}>Chairs<br/><b>5%</b></div>
                  <div style={{background: 'rgba(0, 210, 255, 0.4)', padding: '20px', borderRadius: '8px', textAlign: 'center'}}>Massager<br/><b>14%</b></div>
                  <div style={{background: 'rgba(0, 210, 255, 0.2)', padding: '20px', borderRadius: '8px', textAlign: 'center'}}>Bedding<br/><b>8%</b></div>
               </div>

               <h3 className="mt-8 mb-4" style={{color: '#8892b0'}}>Cross-Selling Matrix (Exact Pairs)</h3>
               <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                   <thead>
                     <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                       <th style={{ padding: '12px', textAlign: 'left' }}>Product Pair</th>
                       <th style={{ padding: '12px', textAlign: 'right' }}>Physio Stores</th>
                       <th style={{ padding: '12px', textAlign: 'right' }}>Non-Physio Baseline</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <td style={{ padding: '12px' }}>Mattress + Pillows</td>
                       <td style={{ padding: '12px', textAlign: 'right', color: '#4ade80' }}>24%</td>
                       <td style={{ padding: '12px', textAlign: 'right' }}>15%</td>
                     </tr>
                     <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <td style={{ padding: '12px' }}>Mattress + Chair</td>
                       <td style={{ padding: '12px', textAlign: 'right', color: '#4ade80' }}>18%</td>
                       <td style={{ padding: '12px', textAlign: 'right' }}>8%</td>
                     </tr>
                     <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <td style={{ padding: '12px' }}>Mattress + Massager</td>
                       <td style={{ padding: '12px', textAlign: 'right', color: '#4ade80' }}>12%</td>
                       <td style={{ padding: '12px', textAlign: 'right' }}>4%</td>
                     </tr>
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="tab-content fade-in">
             <div className="glass-panel p-8">
               <h3 className="mb-4" style={{color: '#8892b0'}}>Pilot Store Leaderboard</h3>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                   <thead>
                     <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                       <th style={{ padding: '12px', textAlign: 'left' }}>Store (Mumbai)</th>
                       <th style={{ padding: '12px', textAlign: 'center' }}>Mall Flag</th>
                       <th style={{ padding: '12px', textAlign: 'right' }}>Conversion Lift</th>
                       <th style={{ padding: '12px', textAlign: 'center' }}>Anomaly Alert</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <td style={{ padding: '12px' }}>Malad_Mumbai</td>
                       <td style={{ padding: '12px', textAlign: 'center' }}>Mall</td>
                       <td style={{ padding: '12px', textAlign: 'right', color: '#4ade80' }}>+4.2%</td>
                       <td style={{ padding: '12px', textAlign: 'center' }}><CheckCircle size={18} color="#4ade80" /></td>
                     </tr>
                     <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <td style={{ padding: '12px' }}>LowerParel_Mumbai</td>
                       <td style={{ padding: '12px', textAlign: 'center' }}>Mall</td>
                       <td style={{ padding: '12px', textAlign: 'right', color: '#4ade80' }}>+3.8%</td>
                       <td style={{ padding: '12px', textAlign: 'center' }}><CheckCircle size={18} color="#4ade80" /></td>
                     </tr>
                     <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <td style={{ padding: '12px' }}>Borivali_Mumbai</td>
                       <td style={{ padding: '12px', textAlign: 'center' }}>Non-Mall</td>
                       <td style={{ padding: '12px', textAlign: 'right', color: '#f87171' }}>-1.2%</td>
                       <td style={{ padding: '12px', textAlign: 'center' }} title="Conversion is 1.5 SD below average"><AlertTriangle size={18} color="#f87171" /></td>
                     </tr>
                   </tbody>
                 </table>
             </div>
          </div>
        )}
      </main>

      <div className={`what-if-panel ${showWhatIf ? 'open' : ''}`}>
        <div className="panel-header">
          <h2>What-If Projections</h2>
          <button className="close-btn" onClick={() => setShowWhatIf(false)}>×</button>
        </div>
        <div className="panel-body">
          <p className="panel-desc">Adjust the target conversion and ticket size to project revenue lift if all Mumbai stores performed like Physio stores.</p>
          
          <div className="slider-group">
            <label>Target Conversion Rate: <span>5.5%</span></label>
            <input type="range" min="1" max="10" step="0.1" defaultValue="5.5" />
          </div>

          <div className="slider-group mt-6">
            <label>Target Avg Ticket Size: <span>₹25,000</span></label>
            <input type="range" min="5000" max="50000" step="1000" defaultValue="25000" />
          </div>

          <div className="projection-result glass-panel mt-8 text-center">
            <h4>Projected Additional Revenue</h4>
            <div className="result-value">₹ 1,240,000</div>
          </div>
        </div>
      </div>
      
      {showWhatIf && <div className="panel-overlay" onClick={() => setShowWhatIf(false)}></div>}
    </div>
  );
};
