/**
 * Vercel Serverless Function: GET /api/pricing
 * Fetches pricing data from Supabase and returns a structured object for the quote funnel.
 * Requires env: SUPABASE_URL, SUPABASE_ANON_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation',
};

async function fetchTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}

function buildPricingPayload(data) {
  const tiers = {};
  (data.pricing_tiers || []).forEach(t => { tiers[t.tier_key] = t.display_name; });

  const solarByTier = {};
  (data.pricing_solar_materials || []).forEach(row => {
    if (!solarByTier[row.tier_key]) solarByTier[row.tier_key] = {};
    solarByTier[row.tier_key][row.cost_key] = {
      price: parseFloat(row.price),
      is_per_panel: !!row.is_per_panel,
    };
  });

  const batteries = {};
  (data.pricing_batteries || []).forEach(b => {
    batteries[b.product_key] = {
      name: b.name,
      tier_key: b.tier_key,
      base_price: parseFloat(b.base_price),
      mounting_kit_price: parseFloat(b.mounting_kit_price || 100),
      extra_unit_discount: parseFloat(b.extra_unit_discount || 0.2),
    };
  });

  const installationByTier = {};
  (data.pricing_installation || []).forEach(row => {
    if (!installationByTier[row.tier_key]) installationByTier[row.tier_key] = {};
    installationByTier[row.tier_key][row.cost_key] = parseFloat(row.price);
  });

  const overheadsByTier = {};
  (data.pricing_overheads || []).forEach(row => {
    if (row.cost_key === 'total') {
      overheadsByTier[row.tier_key] = parseFloat(row.price);
    }
  });

  const addons = {};
  (data.pricing_addons || []).forEach(a => {
    addons[a.product_key] = { name: a.name, price: parseFloat(a.price) };
  });

  return {
    tiers: ['upper', 'mid', 'lower'],
    solar_materials: solarByTier,
    batteries,
    installation: installationByTier,
    overheads: overheadsByTier,
    addons,
    panelWattage: 455,
    panelMin: 6,
    panelMax: 16,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(503).json({
      error: 'Pricing service not configured',
      message: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set in Vercel environment variables.',
    });
  }

  try {
    const [tiers, solar, batteries, installation, overheads, addons] = await Promise.all([
      fetchTable('pricing_tiers'),
      fetchTable('pricing_solar_materials'),
      fetchTable('pricing_batteries'),
      fetchTable('pricing_installation'),
      fetchTable('pricing_overheads'),
      fetchTable('pricing_addons'),
    ]);

    const payload = buildPricingPayload({
      pricing_tiers: tiers,
      pricing_solar_materials: solar,
      pricing_batteries: batteries,
      pricing_installation: installation,
      pricing_overheads: overheads,
      pricing_addons: addons,
    });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('Pricing API error:', err);
    return res.status(500).json({
      error: 'Failed to fetch pricing',
      message: err.message,
    });
  }
}
