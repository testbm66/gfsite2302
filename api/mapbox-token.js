/**
 * Vercel Serverless Function: GET /api/mapbox-token
 * Returns the Mapbox public access token from env vars.
 * Requires env: MAPBOX_TOKEN
 */

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.MAPBOX_TOKEN || '';

  if (!token) {
    return res.status(503).json({ error: 'MAPBOX_TOKEN not configured' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).json({ token });
};
