// --- POSTGRES CONFIG ---
import 'dotenv/config';
import pkg from 'pg';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const { Pool } = pkg;

const url = process.env.DATABASE_URL?.trim();
console.log('DATABASE_URL preview:', url ? url.slice(0, 60) + '...' : 'MISSING');

if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  console.error('❌ DATABASE_URL invalid');
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false }, // Neon cần dòng này!
});

// ✅ Kiểm tra kết nối sớm
await pool.query('SELECT 1');
console.log('✅ Connected to Postgres Neon');

// ============== EXPRESS APP ==============
const app = express();
app.use(express.json());
// CORS (triển khai tách FE/API): tùy biến qua CORS_ORIGIN, mặc định cho phép tất cả
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));

// --- CORS CONFIG ---
import cors from 'cors';

const allowedOrigins = [
  'https://managekpi.id.vn',
  'https://www.managekpi.id.vn',
  'http://localhost:5173', // để test dev
];

app.use(cors({
  origin(origin, callback) {
    // Cho phép nếu không có origin (cURL, server) hoặc nằm trong danh sách
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn('❌ CORS blocked:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
}));


// helper để query gọn
const q = async (text, params) => {
  const res = await pool.query(text, params);
  return res.rows;
};

// route test
app.get('/api/ping', async (req, res) => {
  const { rows } = await pool.query('SELECT NOW()');
  res.json({ ok: true, time: rows[0].now });
});

// DEV ONLY: Clear all reports data
app.delete('/api/dev/clear-reports', async (req, res) => {
  try {
    await q('DELETE FROM reports');
    await q('ALTER SEQUENCE reports_id_seq RESTART WITH 1');
    res.json({ ok: true, message: 'All reports deleted, ID reset to 1' });
  } catch (e) {
    console.error('DELETE /api/dev/clear-reports error', e);
    res.status(500).json({ ok: false, message: 'Failed to clear reports' });
  }
});

// ============== API: Reports CRUD ==============
app.get('/api/reports', async (req, res) => {
  try {
    const rows = await q('SELECT * FROM reports ORDER BY id DESC LIMIT 1000');
    res.json(rows);
  } catch (e) {
    console.error('GET /api/reports error', e);
    res.status(500).json({ ok: false, message: 'Failed to load reports' });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const r = req.body || {};
    const params = [
      r.date || null,
      Number(r.memberId) || null,
      Number(r.contacted) || 0,
      Number(r.replied) || 0,
      Number(r.closed) || 0,
      Number(r.sales) || 0,
      r.warehouse || null,
      r.orderCode || null,
      r.product || null,
      r.status || null,
      r.orderDate || null,
      Number(r.price) || 0,
      r.platform || null,
      r.customerName || null,
      r.fbLink || null,
      r.address || null,
      Number(r.itemPrice) || 0,
      r.note || null,
      r.phone || null,
    ];
    const insertSql = `
      INSERT INTO reports(
        date, memberId, contacted, replied, closed, sales, warehouse, orderCode, product, status, orderDate, price, platform, customerName, fbLink, address, itemPrice, note, phone
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      ) RETURNING *
    `;
    const rows = await q(insertSql, params);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('POST /api/reports error', e);
    res.status(500).json({ ok: false, message: 'Failed to create report' });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid id' });
    const r = req.body || {};
    const params = [
      r.date || null,
      Number(r.memberId) || null,
      Number(r.contacted) || 0,
      Number(r.replied) || 0,
      Number(r.closed) || 0,
      Number(r.sales) || 0,
      r.warehouse || null,
      r.orderCode || null,
      r.product || null,
      r.status || null,
      r.orderDate || null,
      Number(r.price) || 0,
      r.platform || null,
      r.customerName || null,
      r.fbLink || null,
      r.address || null,
      Number(r.itemPrice) || 0,
      r.note || null,
      r.phone || null,
      id,
    ];
    const updateSql = `
      UPDATE reports SET
        date=$1, memberId=$2, contacted=$3, replied=$4, closed=$5, sales=$6,
        warehouse=$7, orderCode=$8, product=$9, status=$10, orderDate=$11,
        price=$12, platform=$13, customerName=$14, fbLink=$15, address=$16,
        itemPrice=$17, note=$18, phone=$19
      WHERE id=$20
      RETURNING *
    `;
    const rows = await q(updateSql, params);
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('PUT /api/reports/:id error', e);
    res.status(500).json({ ok: false, message: 'Failed to update report' });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid id' });
    await q('DELETE FROM reports WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/reports/:id error', e);
    res.status(500).json({ ok: false, message: 'Failed to delete report' });
  }
});

// ============== API: Target Allocation ==============
app.get('/api/target-allocation/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const rows = await q('SELECT member_id, percent FROM target_allocation WHERE month=$1', [month]);
    
    // Convert to object format: { memberId: { percent } }
    const allocation = {};
    rows.forEach(row => {
      allocation[row.member_id] = { percent: parseFloat(row.percent) };
    });
    
    res.json(allocation);
  } catch (e) {
    console.error('GET /api/target-allocation/:month error', e);
    res.status(500).json({ ok: false, message: 'Failed to get target allocation' });
  }
});

app.post('/api/target-allocation', async (req, res) => {
  try {
    const { month, allocation } = req.body;
    if (!month || !allocation) {
      return res.status(400).json({ ok: false, message: 'Missing month or allocation' });
    }
    
    // Delete existing allocations for this month
    await q('DELETE FROM target_allocation WHERE month=$1', [month]);
    
    // Insert new allocations
    for (const [memberId, data] of Object.entries(allocation)) {
      await q(
        'INSERT INTO target_allocation(member_id, month, percent) VALUES($1, $2, $3)',
        [parseInt(memberId), month, data.percent]
      );
    }
    
    res.json({ ok: true, message: 'Target allocation saved' });
  } catch (e) {
    console.error('POST /api/target-allocation error', e);
    res.status(500).json({ ok: false, message: 'Failed to save target allocation' });
  }
});

// ============== API: Team Target (Target tổng theo tháng) ==============
app.get('/api/team-target/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const rows = await q('SELECT target FROM team_target WHERE month=$1', [month]);
    
    if (rows.length === 0) {
      return res.json({ target: 0 }); // Default target = 0 nếu chưa set
    }
    
    res.json({ target: parseInt(rows[0].target) });
  } catch (e) {
    console.error('GET /api/team-target/:month error', e);
    res.status(500).json({ ok: false, message: 'Failed to get team target' });
  }
});

app.post('/api/team-target', async (req, res) => {
  try {
    const { month, target } = req.body;
    if (!month || target === undefined) {
      return res.status(400).json({ ok: false, message: 'Missing month or target' });
    }
    
    // Upsert: Update if exists, insert if not
    await q(`
      INSERT INTO team_target(month, target, updated_at) 
      VALUES($1, $2, NOW())
      ON CONFLICT(month) 
      DO UPDATE SET target=$2, updated_at=NOW()
    `, [month, target]);
    
    res.json({ ok: true, message: 'Team target saved' });
  } catch (e) {
    console.error('POST /api/team-target error', e);
    res.status(500).json({ ok: false, message: 'Failed to save team target' });
  }
});

// ============== API: Authentication ==============
app.post('/api/auth/login', async (req, res) => {
  try {
    const { memberId, pin } = req.body;
    if (!memberId || !pin) {
      return res.status(400).json({ ok: false, message: 'Missing memberId or pin' });
    }
    
    const rows = await q('SELECT id, name, color, role FROM members WHERE id=$1 AND pin=$2', [memberId, pin]);
    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    
    res.json({ ok: true, member: rows[0] });
  } catch (e) {
    console.error('POST /api/auth/login error', e);
    res.status(500).json({ ok: false, message: 'Login failed' });
  }
});

// ============== API: Members ==============
app.get('/api/members', async (req, res) => {
  try {
    const rows = await q('SELECT id, name, color, role FROM members ORDER BY id');
    res.json(rows);
  } catch (e) {
    console.error('GET /api/members error', e);
    res.status(500).json({ ok: false, message: 'Failed to load members' });
  }
});

app.put('/api/members/:id/pin', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { oldPin, newPin } = req.body;
    
    if (!id || !oldPin || !newPin) {
      return res.status(400).json({ ok: false, message: 'Missing id, oldPin, or newPin' });
    }
    
    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ ok: false, message: 'PIN must be 4 digits' });
    }
    
    // Verify old PIN
    const check = await q('SELECT id FROM members WHERE id=$1 AND pin=$2', [id, oldPin]);
    if (check.length === 0) {
      return res.status(401).json({ ok: false, message: 'Old PIN incorrect' });
    }
    
    // Update to new PIN
    await q('UPDATE members SET pin=$1 WHERE id=$2', [newPin, id]);
    res.json({ ok: true, message: 'PIN updated successfully' });
  } catch (e) {
    console.error('PUT /api/members/:id/pin error', e);
    res.status(500).json({ ok: false, message: 'Failed to update PIN' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 KPI app running on http://localhost:${PORT}`));
// (note) q helper moved above for reuse in routes

// Tạo bảng nếu chưa có
await pool.query(`
CREATE TABLE IF NOT EXISTS members(
  id SERIAL PRIMARY KEY,
  name TEXT,
  color TEXT,
  role TEXT,
  pin VARCHAR(4) DEFAULT '0000'
);
CREATE TABLE IF NOT EXISTS reports(
  id SERIAL PRIMARY KEY,
  date TEXT,
  memberId INT,
  contacted INT,
  replied INT,
  closed INT,
  sales BIGINT,
  warehouse TEXT,
  orderCode TEXT,
  product TEXT,
  status TEXT,
  orderDate TEXT,
  price BIGINT,
  platform TEXT,
  customerName TEXT,
  fbLink TEXT,
  address TEXT,
  itemPrice BIGINT,
  note TEXT,
  phone TEXT
);
CREATE TABLE IF NOT EXISTS config(
  id SERIAL PRIMARY KEY,
  startDate TEXT,
  endDate TEXT,
  totalTarget BIGINT,
  aov BIGINT,
  replyRate REAL,
  convRate REAL
);
CREATE TABLE IF NOT EXISTS kpi_targets_by_month(
  id TEXT PRIMARY KEY,
  month TEXT,
  start_date DATE,
  end_date DATE,
  working_days INT,
  target BIGINT
);
CREATE TABLE IF NOT EXISTS target_allocation(
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL,
  month TEXT NOT NULL,
  percent REAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(member_id, month)
);
`);

// Tạo bảng lưu target tổng của team theo tháng
await pool.query(`
CREATE TABLE IF NOT EXISTS team_target(
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL UNIQUE,
  target BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`);

// Bổ sung cột phone nếu thiếu (khi đã có bảng cũ)
await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS phone TEXT`);

// Bổ sung cột pin cho members nếu thiếu
await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS pin VARCHAR(4) DEFAULT '0000'`);

// Seed members (4 người: Mỹ Anh (Leader), Vũ, Quỳnh, Ngân) nếu trống
const mcount = await q('SELECT COUNT(*)::int AS c FROM members');
if ((mcount?.[0]?.c ?? 0) === 0) {
  console.log('🌱 Seeding members...');
  await q(`INSERT INTO members(name, color, role, pin) VALUES
    ('Mỹ Anh', '#fbbf24', 'leader', '1234'),
    ('Vũ', '#3b82f6', NULL, '1111'),
    ('Quỳnh', '#10b981', NULL, '2222'),
    ('Ngân', '#ef4444', NULL, '3333')
  `);
} else {
  // Update existing members with default PINs if they don't have one
  console.log('🔐 Updating default PINs for existing members...');
  await q(`UPDATE members SET pin = '1234' WHERE name = 'Mỹ Anh' AND (pin IS NULL OR pin = '0000')`);
  await q(`UPDATE members SET pin = '1111' WHERE name = 'Vũ' AND (pin IS NULL OR pin = '0000')`);
  await q(`UPDATE members SET pin = '2222' WHERE name = 'Quỳnh' AND (pin IS NULL OR pin = '0000')`);
  await q(`UPDATE members SET pin = '3333' WHERE name = 'Ngân' AND (pin IS NULL OR pin = '0000')`);
  console.log('✅ PIN setup complete');
}

// Seed month targets if empty
const tcount = await q('SELECT COUNT(*)::int AS c FROM kpi_targets_by_month');
if ((tcount?.[0]?.c ?? 0) === 0) {
  console.log('🌱 Seeding kpi_targets_by_month...');
  const targets = [
    { month: '2025-10', start: '2025-10-14', end: '2025-10-31', days: 16, target: 1000666667 },
    { month: '2025-11', start: '2025-11-01', end: '2025-11-30', days: 26, target: 4000000000 },
    { month: '2025-12', start: '2025-12-01', end: '2025-12-31', days: 27, target: 8000000000 },
    { month: '2026-01', start: '2026-01-01', end: '2026-01-19', days: 16, target: 12000000000 },
  ];
  for (const t of targets) {
    await q(`INSERT INTO kpi_targets_by_month(id, month, start_date, end_date, working_days, target) VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), t.month, t.start, t.end, t.days, t.target]);
  }
}

// Seed sample reports if few
const rcount = await q('SELECT COUNT(*)::int AS c FROM reports');
if ((rcount?.[0]?.c ?? 0) < 6) {
  console.log('🌱 Seeding sample reports...');
  // Map first 3 members
  const ms = await q('SELECT id FROM members ORDER BY id ASC LIMIT 3');
  const today = new Date('2025-10-16');
  const mk = (offset)=> new Date(today.getTime() + offset*24*3600*1000).toISOString().slice(0,10);
  const samples = [
    { memberId: ms[0]?.id, date: mk(-2), contacted: 10, replied: 3, closed: 1, sales: 30000000, product:'Long Mã', warehouse:'SG', platform:'Facebook' },
    { memberId: ms[1]?.id, date: mk(-2), contacted: 12, replied: 4, closed: 1, sales: 35000000, product:'Mã Thượng Vân', warehouse:'HN', platform:'Cá nhân' },
    { memberId: ms[2]?.id, date: mk(-2), contacted: 8,  replied: 2, closed: 1, sales: 20000000, product:'Vó Ngựa Nước Nam', warehouse:'SG', platform:'BNI' },
    { memberId: ms[0]?.id, date: mk(-1), contacted: 15, replied: 5, closed: 2, sales: 50000000, product:'Long Mã', warehouse:'SG', platform:'Facebook' },
    { memberId: ms[1]?.id, date: mk(-1), contacted: 9,  replied: 3, closed: 1, sales: 25000000, product:'Mã Đáo Thành Công', warehouse:'HN', platform:'Shopee' },
    { memberId: ms[2]?.id, date: mk(0),  contacted: 11, replied: 3, closed: 1, sales: 27000000, product:'Mã Thượng Vân', warehouse:'Xưởng', platform:'Website' },
  ];
  for (const s of samples) {
    await q(`INSERT INTO reports(date, memberId, contacted, replied, closed, sales, product, warehouse, platform) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [s.date, s.memberId, s.contacted, s.replied, s.closed, s.sales, s.product, s.warehouse, s.platform]);
  }
}

// ============== KPI Endpoints ==============
// Members (id as text)
app.get('/api/members', async (req, res) => {
  try{
    const rows = await q('SELECT id::text as id, name, NULL as phone, TRUE as active FROM members ORDER BY id');
    res.json(rows);
  }catch(e){
    console.error(e); res.status(500).json({ ok:false, message:'Failed to load members' });
  }
});

// KPI targets by month
app.get('/api/kpi/targets', async (req,res)=>{
  try{
    const rows = await q('SELECT id, month, to_char(start_date,\'YYYY-MM-DD\') as start_date, to_char(end_date,\'YYYY-MM-DD\') as end_date, working_days, target FROM kpi_targets_by_month ORDER BY month');
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({ ok:false, message:'Failed to load targets' }); }
});

// Reports list (mapped fields)
app.get('/api/kpi/reports', async (req,res)=>{
  try{
    const { memberId, from, to } = req.query;
    const cond = [];
    const params = [];
    if (memberId && memberId !== 'all') { params.push(Number(memberId)); cond.push(`memberId = $${params.length}`); }
    if (from) { params.push(String(from)); cond.push(`date >= $${params.length}`); }
    if (to) { params.push(String(to)); cond.push(`date <= $${params.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const rows = await q(`SELECT id::text as id, memberId::text as member_id, date as report_date, contacted as reach, replied as responses, closed as deals, sales as revenue, product, platform as channel, orderCode as order_code, orderDate as order_date, note FROM reports ${where} ORDER BY date DESC, id DESC` , params);
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({ ok:false, message:'Failed to load reports' }); }
});

// Create report (mapped)
app.post('/api/kpi/reports', async (req,res)=>{
  try{
    const r = req.body || {};
    // Validate
    const required = ['report_date','member_id','reach','responses','deals','revenue'];
    for (const k of required) if (r[k] == null || r[k] === '') return res.status(400).json({ ok:false, message:`Missing ${k}` });
    const params = [
      String(r.report_date),
      Number(r.member_id),
      Number(r.reach)||0,
      Number(r.responses)||0,
      Number(r.deals)||0,
      Number(r.revenue)||0,
      r.warehouse||null,
      r.order_code||null,
      r.product||null,
      null,
      String(r.order_date||r.report_date),
      null,
      r.channel||null,
      null,
      null,
      null,
      null,
      r.note||null,
      r.phone||null,
    ];
    const sql = `INSERT INTO reports(
      date, memberId, contacted, replied, closed, sales, warehouse, orderCode, product, status, orderDate, price, platform, customerName, fbLink, address, itemPrice, note, phone
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
    ) RETURNING id::text as id, memberId::text as member_id, date as report_date, contacted as reach, replied as responses, closed as deals, sales as revenue, product, platform as channel, orderCode as order_code, orderDate as order_date, note`;
    const rows = await q(sql, params);
    res.status(201).json(rows[0]);
  }catch(e){ console.error(e); res.status(500).json({ ok:false, message:'Failed to create report' }); }
});

// Summary endpoint
app.get('/api/kpi/summary', async (req,res)=>{
  try{
    const { month, memberId } = req.query;
    // Determine date range
    let range;
    if (month && month !== 'all') {
      const row = (await q('SELECT to_char(start_date,\'YYYY-MM-DD\') as s, to_char(end_date,\'YYYY-MM-DD\') as e FROM kpi_targets_by_month WHERE month=$1', [month]))[0];
      if (row) range = { from: row.s, to: row.e };
    }
    if (!range) {
      const row = (await q('SELECT min(start_date)::text as s, max(end_date)::text as e FROM kpi_targets_by_month'))[0];
      range = { from: row.s, to: row.e };
    }
    const cond = ['date >= $1','date <= $2'];
    const params = [range.from, range.to];
    if (memberId && memberId !== 'all') { params.push(Number(memberId)); cond.push(`memberId = $${params.length}`); }
    const where = `WHERE ${cond.join(' AND ')}`;
    const teamRows = await q(`SELECT COALESCE(SUM(sales),0)::bigint as sales, COALESCE(SUM(contacted),0)::int as reach, COALESCE(SUM(replied),0)::int as responses, COALESCE(SUM(closed),0)::int as deals FROM reports ${where}`, params);
    const team = teamRows[0] || { sales:0, reach:0, responses:0, deals:0 };
    const byMemberRows = await q(`SELECT memberId::text as member_id, COALESCE(SUM(sales),0)::bigint as sales, COALESCE(SUM(contacted),0)::int as reach, COALESCE(SUM(replied),0)::int as responses, COALESCE(SUM(closed),0)::int as deals FROM reports ${where} GROUP BY memberId`, params);
    const byMember = {};
    for (const r of byMemberRows) byMember[r.member_id] = { sales: Number(r.sales), reach: Number(r.reach), responses: Number(r.responses), deals: Number(r.deals) };
    const byDay = await q(`SELECT date as date, COALESCE(SUM(sales),0)::bigint as sales, COALESCE(SUM(contacted),0)::int as reach, COALESCE(SUM(replied),0)::int as responses, COALESCE(SUM(closed),0)::int as deals FROM reports ${where} GROUP BY date ORDER BY date`, params);
    const monthAgg = team; // same range
    res.json({ team: { sales: Number(team.sales), reach: Number(team.reach), responses: Number(team.responses), deals: Number(team.deals) }, byMember, byDay, monthAgg });
  }catch(e){ console.error(e); res.status(500).json({ ok:false, message:'Failed to load summary' }); }
});

