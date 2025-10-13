// server/server.js
import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// DB: ./data/kpi.sqlite (persist)
const dbPath = path.join(__dirname, "..", "data", "kpi.sqlite");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// tables
db.exec(`
CREATE TABLE IF NOT EXISTS members(
  id INTEGER PRIMARY KEY, name TEXT, color TEXT, role TEXT
);
CREATE TABLE IF NOT EXISTS reports(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT, memberId INTEGER,
  contacted INTEGER, replied INTEGER, closed INTEGER, sales INTEGER,
  warehouse TEXT, orderCode TEXT, product TEXT, status TEXT, orderDate TEXT,
  price INTEGER, platform TEXT, customerName TEXT, fbLink TEXT, address TEXT,
  itemPrice INTEGER, note TEXT
);
CREATE TABLE IF NOT EXISTS config(
  id INTEGER PRIMARY KEY CHECK (id=1),
  startDate TEXT, endDate TEXT,
  totalTarget INTEGER, aov INTEGER,
  replyRate REAL, convRate REAL
);
`);

// seed members if empty
const seed = db.prepare("SELECT COUNT(*) c FROM members").get().c;
if (seed === 0) {
  const ins = db.prepare("INSERT INTO members(id,name,color,role) VALUES(?,?,?,?)");
  const tx = db.transaction((rows)=> rows.forEach(r=>ins.run(r.id,r.name,r.color,r.role||null)));
  tx([
    {id:1,name:"Vũ",    color:"#3b82f6"},
    {id:2,name:"Quỳnh", color:"#10b981"},
    {id:3,name:"Mỹ Anh",color:"#f59e0b", role:"leader"},
    {id:4,name:"Ngân",  color:"#ef4444"},
  ]);
}
const cfgCount = db.prepare("SELECT COUNT(*) c FROM config").get().c;
if (cfgCount === 0) {
  db.prepare(`
    INSERT INTO config(id,startDate,endDate,totalTarget,aov,replyRate,convRate)
    VALUES(1,'2025-10-14','2026-01-19',25000000000,3000000,0.2,0.1)
  `).run();
}

// simple auth by header key
const LEADER_KEY = process.env.LEADER_KEY || "leader-2026";
const MEMBER_KEY = process.env.MEMBER_KEY || "member-2026";
const requireKey = (role) => (req,res,next)=>{
  const key = req.header("X-KEY");
  if (role === "leader" && key === LEADER_KEY) return next();
  if (role === "member" && (key === MEMBER_KEY || key === LEADER_KEY)) return next();
  return res.status(401).json({error:"Unauthorized"});
};

// options (tuỳ chỉnh sau)
const OPTIONS = {
  status: ["Đã giao hàng","Đang sản xuất","24H xử lý","Chờ thanh toán","Hủy"],
  platform: ["SẾP","BNI","Cá nhân","Facebook","Shopee","Website"],
  product: ["SP A","SP B","SP C","Combo 1","Customize"],
  warehouse: ["SG","HN","Xưởng"],
};

// APIs
app.get("/api/options", (req,res)=> res.json(OPTIONS));

// members
app.get("/api/members", requireKey("member"), (req,res)=>{
  const rows = db.prepare("SELECT * FROM members").all();
  res.json(rows);
});

// members except leader
app.get("/api/members/for-member", requireKey("member"), (req,res)=>{
  const rows = db.prepare("SELECT * FROM members WHERE IFNULL(role,'')!='leader'").all();
  res.json(rows);
});

// reports
app.get("/api/reports", requireKey("member"), (req,res)=>{
  const rows = db.prepare("SELECT * FROM reports ORDER BY date DESC, id DESC").all();
  res.json(rows);
});
app.get("/api/reports/for-member", requireKey("member"), (req,res)=>{
  const rows = db.prepare(`
    SELECT * FROM reports
    WHERE memberId IN (SELECT id FROM members WHERE IFNULL(role,'')!='leader')
    ORDER BY date DESC, id DESC
  `).all();
  res.json(rows);
});
app.post("/api/report", requireKey("member"), (req,res)=>{
  const r = req.body || {};
  const stmt = db.prepare(`
    INSERT INTO reports(
      date,memberId,contacted,replied,closed,sales,
      warehouse,orderCode,product,status,orderDate,
      price,platform,customerName,fbLink,address,
      itemPrice,note
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const info = stmt.run(
    r.date, r.memberId, r.contacted||0, r.replied||0, r.closed||0, r.sales||0,
    r.warehouse||null, r.orderCode||null, r.product||null, r.status||null, r.orderDate||null,
    r.price||0, r.platform||null, r.customerName||null, r.fbLink||null, r.address||null,
    r.itemPrice||0, r.note||null
  );
  res.json({ok:true, id: info.lastInsertRowid});
});
app.delete("/api/report/:id", requireKey("leader"), (req,res)=>{
  db.prepare("DELETE FROM reports WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

// config
app.get("/api/config", requireKey("member"), (req,res)=>{
  const row = db.prepare("SELECT * FROM config WHERE id=1").get();
  res.json(row);
});
app.post("/api/config", requireKey("leader"), (req,res)=>{
  const c = req.body || {};
  db.prepare(`
    UPDATE config SET
      startDate=?, endDate=?, totalTarget=?, aov=?, replyRate=?, convRate=?
    WHERE id=1
  `).run(c.startDate, c.endDate, c.totalTarget, c.aov, c.replyRate, c.convRate);
  res.json({ok:true});
});

// ==== Serve static React build (client/dist) ====
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("/*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log("KPI app running on http://localhost:"+PORT));
