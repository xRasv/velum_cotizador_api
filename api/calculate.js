import { calculateProduct, buildDescription } from '../lib/calculator.js';

export default async function handler(req, res) {
  // CORS handles preflight automatically via vercel.json, but good practice
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Very simple API key security
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  // We check against process.env.API_KEY. For local we can accept anything if API_KEY is missing, but let's be strict.
  const expectedKey = (process.env.API_KEY || 'development_key').trim();
  
  // Remove "Bearer " if someone passes it in Authorization header
  const providedKey = apiKey ? apiKey.replace('Bearer ', '') : '';

  if (providedKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  try {
    const params = req.body;
    if (!params || !params.product_type) {
      return res.status(400).json({ error: 'Missing product_type in request body' });
    }

    const pricing = calculateProduct(params);
    const description = buildDescription(params);

    return res.status(200).json({
      success: true,
      description,
      pricing
    });
  } catch (error) {
    console.error("Calculation Error:", error);
    return res.status(400).json({ error: error.message || 'Error executing calculation' });
  }
}

