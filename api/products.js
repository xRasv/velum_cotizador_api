import { supabase } from '../lib/supabase.js';

/**
 * GET /api/products — List all products (optionally with their fabrics).
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Auth check
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  const expectedKey = (process.env.API_KEY || 'development_key').trim();
  const providedKey = apiKey ? apiKey.replace('Bearer ', '') : '';
  if (providedKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  try {
    const withFabrics = req.query.include_fabrics === 'true';

    const selectFields = withFabrics
      ? 'id, name, visible_name, image_url, product_fabrics(id, name, fabric_price, image_url)'
      : 'id, name, visible_name, image_url';

    const { data, error } = await supabase
      .from('products')
      .select(selectFields)
      .order('name');

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Products Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

