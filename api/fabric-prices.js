import { supabase } from '../lib/supabase.js';

/**
 * Validates API key from headers.
 */
function authenticate(req) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  const expectedKey = process.env.API_KEY || 'development_key';
  const providedKey = apiKey ? apiKey.replace('Bearer ', '') : '';
  return providedKey === expectedKey;
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Auth check
  if (!authenticate(req)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  try {
    switch (req.method) {

      // ─── LIST ALL FABRIC PRICES (with product name) ──────────────────
      case 'GET': {
        const { product_id } = req.query;

        let query = supabase
          .from('product_fabrics')
          .select('id, name, fabric_price, image_url, created_at, product_id, products(name, image_url)')
          .order('name');

        if (product_id) {
          query = query.eq('product_id', product_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ success: true, data });
      }

      // ─── CREATE A NEW FABRIC PRICE ───────────────────────────────────
      case 'POST': {
        const { product_id, name, fabric_price, image_url } = req.body;

        if (!product_id || !name || fabric_price === undefined) {
          return res.status(400).json({ error: 'Missing required fields: product_id, name, fabric_price' });
        }

        const { data, error } = await supabase
          .from('product_fabrics')
          .insert({ product_id, name, fabric_price, image_url })
          .select()
          .single();

        if (error) throw error;

        return res.status(201).json({ success: true, data });
      }

      // ─── UPDATE AN EXISTING FABRIC PRICE ─────────────────────────────
      case 'PUT': {
        const { id, ...updates } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Missing required field: id' });
        }

        const { data, error } = await supabase
          .from('product_fabrics')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json({ success: true, data });
      }

      // ─── DELETE A FABRIC PRICE ───────────────────────────────────────
      case 'DELETE': {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Missing required field: id' });
        }

        const { error } = await supabase
          .from('product_fabrics')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Deleted successfully' });
      }

      default:
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Fabric Prices Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
