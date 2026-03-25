/**
 * Calculator Unit Tests
 * Run with: node lib/calculator.test.js
 */

import {
  calculateEnrollable,
  calculateDiaYNoche,
  calculateTradicional,
  calculateVertical,
  calculateProduct,
  buildDescription,
} from './calculator.js';

let passed = 0;
let failed = 0;

function assert(name, actual, expected, tolerance = 0.01) {
  const match = typeof expected === 'number'
    ? Math.abs(actual - expected) < tolerance
    : actual === expected;

  if (match) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

// ─── Enrollables ─────────────────────────────────────────────────────────────

console.log('\n📦 Enrollables');

{
  // Test: 2.90m × 2.10m, fabric at Q85/yard, profit 100%, IVA 12%
  // basePrice = ((2.10 + 0.2) / 0.91) * 85 + (2.90 * 100) + 60
  // = (2.30 / 0.91) * 85 + 290 + 60
  // = 2.527472527 * 85 + 350
  // = 214.835... + 350
  // = 564.835...
  // profit = 564.835 * 1.0 = 564.835
  // totalSinIva = 564.835 + 564.835 + 0 = 1129.67
  // totalConIva = 1129.67 * 1.12 = 1265.23
  const r = calculateEnrollable(2.90, 2.10, 85, 100, 12, 0);
  assert('basePrice check (totalCosto)', r.totalCosto, 564.84, 1);
  assert('totalSinIva', r.totalSinIva, 1129.67, 1);
  assert('totalConIva', r.totalConIva, 1265.23, 2);
}

// ─── Día y Noche ─────────────────────────────────────────────────────────────

console.log('\n📦 Día y Noche');

{
  // Test: 2m × 2m, fabric at Q100/m, profit 100%, IVA 12%
  // fabricYards = ((2 + 0.2) / 0.91) * 2 = 4.835...
  // fabricCost = 4.835 * 100 = 483.5
  // mechanismCost = 2 * 150 + 75 = 375
  // basePrice = 858.5
  const r = calculateDiaYNoche(2, 2, 100, 100, 12, 0);
  assert('totalCosto', r.totalCosto, 858.52, 1);
  assert('totalConIva', r.totalConIva, 1923.08, 2);
}

// ─── Tradicionales ───────────────────────────────────────────────────────────

console.log('\n📦 Tradicionales - RippleFold');

{
  // Test: 3m × 2.5m, fabric at Q120/m, RippleFold, profit 100%, IVA 12%
  // laborCost = 100 * 3 = 300
  // stylePrice = 160 * 3 = 480
  // fabricCost = (2.5 * 3 * 120) / 0.91 = 900/0.91 = 989.01
  // basePrice = 989.01 + 480 + 300 = 1769.01
  const r = calculateTradicional(3, 2.5, 120, 'RippleFold', 100, 12, 0);
  assert('totalCosto', r.totalCosto, 1769.01, 2);
  assert('totalConIva', r.totalConIva, 3962.58, 3);
}

console.log('\n📦 Tradicionales - Ojetes (width <= 4)');

{
  // Test: 3m, Ojetes
  // stylePrice = 350 + 70*3 = 560
  const r = calculateTradicional(3, 2.5, 120, 'Ojetes', 100, 12, 0);
  assert('totalCosto > 0', r.totalCosto > 0, true);
}

console.log('\n📦 Tradicionales - Ojetes (width > 4)');

{
  // Test: 4.5m, Ojetes
  // stylePrice = 500 + 70*4.5 = 815
  const r = calculateTradicional(4.5, 2.5, 120, 'Ojetes', 100, 12, 0);
  assert('totalCosto > 0', r.totalCosto > 0, true);
}

// ─── Verticales ──────────────────────────────────────────────────────────────

console.log('\n📦 Verticales - PVC');

{
  // Test: 1m × 1m PVC
  // rowHeaders: first >= 1.0 is index 5 (value 1.0)
  // colHeaders: first >= 1.0 is index 5 (value 1.0)
  // pvcPrecios[5][5] = 365
  // basePrice = 1.2 * 365 = 438
  const r = calculateVertical(1.0, 1.0, 'PVC', 100, 12, 0);
  assert('totalCosto', r.totalCosto, 1.2 * 365, 1);
}

console.log('\n📦 Verticales - Tela');

{
  // Test: 1m × 1m Tela
  // rowHeadersTela: first >= 1.0 is index 3 (value 1.0)
  // colHeadersTela: first >= 1.0 is index 3 (value 1.0)
  // telaPrecios[3][3] = 456
  // basePrice = 1.3 * 456 = 592.8
  const r = calculateVertical(1.0, 1.0, 'Tela', 100, 12, 0);
  assert('totalCosto', r.totalCosto, 1.3 * 456, 1);
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

console.log('\n📦 Dispatcher');

{
  const r = calculateProduct({
    product_type: 'enrollable',
    width: 2.90,
    height: 2.10,
    price: 85,
  });
  assert('dispatcher works for enrollable', r.totalConIva > 0, true);
}

// ─── Description Builder ─────────────────────────────────────────────────────

console.log('\n📦 Description Builder');

{
  const d = buildDescription({ product_type: 'enrollable', width: 2.90, height: 2.10, fabric_name: 'Blackout' });
  assert('enrollable description', d, 'Cortina Enrollable Blackout | 2.9m x 2.1m');
}

{
  const d = buildDescription({ product_type: 'vertical', width: 1.5, height: 2.0, vertical_type: 'PVC' });
  assert('vertical description', d, 'Cortina Vertical de PVC | 1.5m x 2m');
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
