import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SHEET_ID = '1OkBRqhq49BbihtshW8baJfMHzD-a7cMOwA61KtzFvoE';

async function fetchTab(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  console.log(`Fetching tab: ${tabName}`);
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch tab ${tabName}`);
  
  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  return parsed.data;
}

async function runSync() {
  console.log("Starting Physio Dashboard Data Sync...");

  try {
    const [salesData, storeMasterData, crossSellData, leadsData] = await Promise.all([
      fetchTab('Sales Dump MTD'),
      fetchTab('Store Master'),
      fetchTab('cross sell'),
      fetchTab('Leads Extract')
    ]);

    // Build a store dictionary for fast lookups
    const storeLookup = {};
    storeMasterData.forEach(store => {
      if (store.store_name || store.Store_Name) {
        const name = store.store_name || store.Store_Name;
        storeLookup[name.toLowerCase()] = {
          mall_flag: store['Mall Flag'] || store.Mall_Flag || 'Non-Mall',
          city: store.City || store.city || store.City_Type
        };
      }
    });

    // 1. Process Sales Dump MTD
    const salesUpserts = salesData.map(row => {
      const storeName = row.store_name || row.Store_Name;
      const lookup = storeLookup[storeName?.toLowerCase()] || {};
      
      const totalWalkins = parseInt(row.total_walkins) || 0;
      
      // Match lead data
      const storeLead = leadsData.find(l => (l.store_name || l.Store_Name) === storeName);
      const digitalLeads = storeLead ? parseInt(storeLead['Digital Leads']) || 0 : 0;
      
      const organicWalkins = Math.max(0, totalWalkins - digitalLeads);

      return {
        store_name: storeName,
        date: row.Date || row.date || new Date().toISOString().split('T')[0],
        mall_flag: lookup.mall_flag || 'Non-Mall',
        city: lookup.city || 'Unknown',
        total_walkins: totalWalkins,
        organic_walkins: organicWalkins,
        buyers: parseInt(row.buyers) || 0,
        sales: parseFloat(row.sales) || 0,
        mattress_buyers: parseInt(row.Mattress_Buyer || row.mattress_qty) || 0,
        mattress_sales: parseFloat(row.mattress_sales) || 0,
        retail_experience: parseFloat(row.Retail_2_Experience) || 0
      };
    }).filter(r => r.store_name);

    if (salesUpserts.length > 0) {
      console.log(`Upserting ${salesUpserts.length} rows to physio_sales...`);
      const { error } = await supabase.from('physio_sales').upsert(salesUpserts, { onConflict: 'store_name,date' });
      if (error) console.error("Error upserting sales:", error.message);
    }

    // 2. Process Cross Sell
    const crossSellUpserts = crossSellData.map(row => {
      const storeName = row.store_name || row.Store_Name;
      return {
        store_name: storeName,
        mattress_chair: parseInt(row.mattress_chair || row.Mattress_Chair) || 0,
        mattress_bed: parseInt(row.mattress_bed || row.Mattress_Bed) || 0,
      };
    }).filter(r => r.store_name);

    if (crossSellUpserts.length > 0) {
      console.log(`Upserting ${crossSellUpserts.length} rows to physio_cross_sell...`);
      const { error } = await supabase.from('physio_cross_sell').upsert(crossSellUpserts, { onConflict: 'store_name' });
      if (error) console.error("Error upserting cross-sell:", error.message);
    }

    // 3. Process Leads
    const leadsUpserts = leadsData.map(row => {
      const storeName = row.store_name || row.Store_Name;
      return {
        store_name: storeName,
        digital_leads: parseInt(row['Digital Leads']) || 0,
        total_leads: parseInt(row['Total Leads']) || 0
      };
    }).filter(r => r.store_name);

    if (leadsUpserts.length > 0) {
      console.log(`Upserting ${leadsUpserts.length} rows to physio_leads...`);
      const { error } = await supabase.from('physio_leads').upsert(leadsUpserts, { onConflict: 'store_name' });
      if (error) console.error("Error upserting leads:", error.message);
    }

    console.log("Sync Complete!");
  } catch (error) {
    console.error("Fatal Error during sync:", error);
  }
}

runSync();
