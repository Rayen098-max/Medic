import { useState, useEffect } from 'react';
import { supabase } from '../../utils/db';

export const usePhysioData = () => {
  const [data, setData] = useState({
    conversionLift: 0,
    roi: 0,
    leadConversion: 0,
    trendData: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchAndCalculate = async () => {
      try {
        if (!supabase) throw new Error("Supabase is not configured.");

        const { data: sales, error } = await supabase
          .from('physio_sales')
          .select('*');
          
        if (error) throw error;

        // Ensure we handle empty states gracefully
        if (!sales || sales.length === 0) {
           return setData(prev => ({ ...prev, loading: false }));
        }

        // Basic aggregations
        let physioBuyers = 0, physioWalkins = 0;
        let nonPhysioBuyers = 0, nonPhysioWalkins = 0;
        let totalPhysioRevenue = 0;

        // Mock grouping by week for the trend chart
        const weeklyData = {
          'Week 1': { pSales: 0, pWalkins: 0, npSales: 0, npWalkins: 0 },
          'Week 2': { pSales: 0, pWalkins: 0, npSales: 0, npWalkins: 0 },
          'Week 3': { pSales: 0, pWalkins: 0, npSales: 0, npWalkins: 0 },
          'Week 4': { pSales: 0, pWalkins: 0, npSales: 0, npWalkins: 0 }
        };

        // We arbitrarily assign rows to weeks based on index just for the visual trend
        sales.forEach((row, i) => {
          const isPhysio = row.store_name?.includes('Mumbai'); // Example check based on pilot 7 logic
          const weekKey = `Week ${(i % 4) + 1}`;
          
          if (isPhysio) {
            physioBuyers += row.buyers || 0;
            physioWalkins += row.total_walkins || 0;
            totalPhysioRevenue += row.sales || 0;
            weeklyData[weekKey].pSales += row.buyers || 0;
            weeklyData[weekKey].pWalkins += row.total_walkins || 0;
          } else {
            nonPhysioBuyers += row.buyers || 0;
            nonPhysioWalkins += row.total_walkins || 0;
            weeklyData[weekKey].npSales += row.buyers || 0;
            weeklyData[weekKey].npWalkins += row.total_walkins || 0;
          }
        });

        const physioConv = physioWalkins > 0 ? (physioBuyers / physioWalkins) * 100 : 0;
        const nonPhysioConv = nonPhysioWalkins > 0 ? (nonPhysioBuyers / nonPhysioWalkins) * 100 : 0;
        
        // 1. Conversion Lift
        const conversionLift = (physioConv - nonPhysioConv).toFixed(1);

        // 2. ROI (Deducting 50k per physio - Assuming 7 physios)
        const totalPhysioCost = 7 * 50000; 
        const roi = totalPhysioRevenue - totalPhysioCost;

        // 3. Lead Conversion (mock calculation for now)
        const leadConversion = 12.4; 

        // Build Trend Data
        const trendData = Object.keys(weeklyData).map(week => {
           const w = weeklyData[week];
           return {
             name: week,
             physio: w.pWalkins > 0 ? ((w.pSales / w.pWalkins) * 100).toFixed(1) : 0,
             baseline: w.npWalkins > 0 ? ((w.npSales / w.npWalkins) * 100).toFixed(1) : 0
           };
        });

        setData({
          conversionLift,
          roi: isNaN(roi) ? 0 : roi,
          leadConversion,
          trendData,
          loading: false,
          error: null
        });

      } catch (err) {
        console.error("Error fetching physio data:", err);
        setData(prev => ({ ...prev, loading: false, error: err.message }));
      }
    };

    fetchAndCalculate();
  }, []);

  return data;
};
