import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Target, Users, Calendar, DollarSign, Download, Cog, ShieldCheck, BarChart2, FileText, ClipboardList, ChevronRight, LogOut } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

/**
 * UI – Sales KPI (2 trang Leader/Member)
 * Chỉ phần GIAO DIỆN (Frontend). Không phụ thuộc backend – dùng mock data tại chỗ để bạn preview nhanh.
 * Khi kết nối server thật, chỉ cần thay các hook/fetch trong 3 TODO đã đánh dấu.
 *
 * Thư viện cần:
 * - react-router-dom
 * - recharts
 * - lucide-react
 * - tailwindcss (khuyến nghị; nếu chưa dùng Tailwind, có thể thay class bằng CSS của bạn)
 */

// ===== Helpers =====
const fmtMoneyShort = (v) => {
  if (!v && v !== 0) return "-";
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + "K";
  return String(v);
};
const toISO = (d) => new Date(d).toISOString().split("T")[0];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]; // xanh, lục, cam, đỏ, tím, teal

// Mock options (có thể đổi sau khi nối backend)
const DEFAULT_OPTIONS = {
  status: ["Đã giao hàng", "Đang sản xuất", "24H xử lý", "Chờ thanh toán", "Hủy"],
  platform: ["SẾP", "BNI", "Cá nhân", "Facebook", "Shopee", "Website"],
  product: ["SP A", "SP B", "SP C", "Combo 1", "Customize"],
  warehouse: ["SG", "HN", "Xưởng"],
};

// Seed team (4 người; leader = Mỹ Anh)
const SEED_MEMBERS = [
  { id: 1, name: "Vũ", color: COLORS[0] },
  { id: 2, name: "Quỳnh", color: COLORS[1] },
  { id: 3, name: "Mỹ Anh", color: COLORS[2], role: "leader" },
  { id: 4, name: "Ngân", color: COLORS[3] },
];

// ==== App Shell ====
function AppShell({ children, title }) {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Target className="text-blue-600" /> KPI Tết 2026
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/leader" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1"><ShieldCheck size={16}/> Leader</Link>
            <Link to="/member" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1"><Users size={16}/> Member</Link>
            <button onClick={()=>nav(-1)} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1"><ChevronRight className="rotate-180" size={16}/> Back</button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4">{children}</main>
      <footer className="text-center text-xs text-gray-500 py-6">© {new Date().getFullYear()} Sales KPI – demo UI</footer>
    </div>
  );
}

// ==== Top-level App with routes ====
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell title="Home"><Home/></AppShell>} />
        <Route path="/leader" element={<AppShell title="Leader"><LeaderPage/></AppShell>} />
        <Route path="/member" element={<AppShell title="Member"><MemberPage/></AppShell>} />
        <Route path="*" element={<AppShell><NotFound/></AppShell>} />
      </Routes>
    </BrowserRouter>
  );
}

function Home(){
  return (
    <div className="grid gap-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-2">Chọn trang</h1>
        <p className="text-gray-600 mb-4">Bản UI demo – chỉ giao diện. Khi triển khai thật sẽ nối API để lưu DB & phân quyền.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/leader" className="flex-1 p-4 rounded-xl border hover:shadow transition bg-blue-50">
            <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold"><ShieldCheck/> Leader</div>
            <p className="text-sm text-blue-900">Xem & chỉnh cấu hình KPI, tổng quan doanh số, hiệu suất 3 thành viên còn lại, thêm báo cáo.</p>
          </Link>
          <Link to="/member" className="flex-1 p-4 rounded-xl border hover:shadow transition bg-emerald-50">
            <div className="flex items-center gap-2 mb-2 text-emerald-700 font-semibold"><Users/> Member</div>
            <p className="text-sm text-emerald-900">Gửi báo cáo hằng ngày, xem bảng doanh số của 3 thành viên (ngoại trừ Mỹ Anh).</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFound(){
  return <div className="bg-white rounded-xl shadow p-6">Không tìm thấy trang.</div>;
}

// ======= Shared components =======
function KPIQuickCards({ totalTarget, perMemberTarget, dailyPerMember, weeklyPerMember, requiredContacted, requiredReplied, dealsPerDay }){
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card color="from-blue-500 to-blue-600" icon={<Users/>} label="Target/người" value={fmtMoneyShort(perMemberTarget)} sub="/toàn kỳ"/>
      <Card color="from-green-500 to-green-600" icon={<Calendar/>} label="/Tuần (T2–T7)" value={fmtMoneyShort(weeklyPerMember)} sub="ước tính theo ngày làm việc"/>
      <Card color="from-orange-500 to-orange-600" icon={<DollarSign/>} label="/Ngày" value={fmtMoneyShort(dailyPerMember)} sub="/người"/>
      <Card color="from-rose-500 to-rose-600" icon={<BarChart2/>} label="KH/ngày" value={Math.ceil(requiredContacted)} sub={`${Math.ceil(requiredReplied)} phản hồi · ${dealsPerDay.toFixed(2)} deal`}/>
    </div>
  );
}
function Card({ color, icon, label, value, sub }){
  return (
    <div className={`rounded-xl p-5 text-white shadow bg-gradient-to-br ${color}`}>
      <div className="flex items-center justify-between text-sm opacity-90">{icon}<span>{label}</span></div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-90 mt-1">{sub}</div>
    </div>
  );
}

function TeamOverview({ members, reports, totalTarget }){
  const perMember = totalTarget / members.length;
  const byMember = members.map(m => {
    const rs = reports.filter(r => r.memberId === m.id);
    const totalSales = rs.reduce((s,r)=>s + r.sales, 0);
    const totalContacted = rs.reduce((s,r)=>s + r.contacted, 0);
    const totalReplied = rs.reduce((s,r)=>s + r.replied, 0);
    const progress = (totalSales / perMember) * 100;
    const convRate = totalContacted ? (totalReplied / totalContacted) * 100 : 0;
    return { ...m, totalSales, totalContacted, totalReplied, progress, convRate, remaining: Math.max(perMember - totalSales, 0) };
  });
  const totalSales = byMember.reduce((s,m)=>s+m.totalSales,0);
  const overall = (totalSales / totalTarget) * 100;

  const barData = byMember.map(m=>({ name:m.name, target: perMember, achieved: m.totalSales }));

  return (
    <div className="grid gap-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-700">Tiến độ chung</div>
          <div className="text-sm font-bold text-blue-600">{overall.toFixed(2)}%</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${Math.min(overall,100)}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-600">
          <span>Đã đạt: {fmtMoneyShort(totalSales)}</span>
          <span>Còn lại: {fmtMoneyShort(totalTarget - totalSales)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-3">📈 Target vs Thực tế</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={fmtMoneyShort} />
              <Tooltip formatter={(v)=>fmtMoneyShort(v)} />
              <Legend />
              <Bar dataKey="achieved" name="Đã đạt" fill="#3b82f6" />
              <Bar dataKey="target" name="Target/người" fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-3">📊 Tỷ trọng doanh số</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byMember} dataKey="totalSales" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                {byMember.map((m,i)=> <Cell key={m.id} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v)=>fmtMoneyShort(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-gray-800 mb-4">👥 Hiệu suất theo thành viên</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {byMember.map((m)=> (
            <div key={m.id} className="p-4 border rounded-lg" style={{ borderColor: m.color }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{m.name}</div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100" style={{ color: m.color }}>{m.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2 mb-2">
                <div className="h-2 rounded" style={{ width: `${Math.min(m.progress,100)}%`, background: m.color }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Đã đạt: <b>{fmtMoneyShort(m.totalSales)}</b></div>
                <div>Còn lại: <b>{fmtMoneyShort(m.remaining)}</b></div>
                <div>Tiếp cận: <b>{m.totalContacted}</b></div>
                <div>Phản hồi: <b>{m.totalReplied}</b> ({m.convRate.toFixed(1)}%)</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportForm({ members, options, onSubmit, defaults }){
  const [form, setForm] = useState({
    date: toISO(new Date()),
    memberId: members[0]?.id || 1,
    contacted: "",
    replied: "",
    closed: "",
    sales: "",
    // fields theo ảnh
    warehouse: "",
    orderCode: "",
    product: "",
    status: "",
    orderDate: toISO(new Date()),
    price: "",
    platform: "",
    customerName: "",
    fbLink: "",
    address: "",
    itemPrice: "",
    note: "",
    ...(defaults || {})
  });

  const onChange = (k, v) => setForm((s)=>({ ...s, [k]: v }));

  const submit = () => {
    if (!form.contacted || !form.sales) {
      alert("Vui lòng nhập Số KH tiếp cận và Doanh số!");
      return;
    }
    const payload = {
      ...form,
      memberId: Number(form.memberId),
      contacted: Number(form.contacted)||0,
      replied: Number(form.replied)||0,
      closed: Number(form.closed)||0,
      sales: Number(form.sales)||0,
      price: Number(form.price)||0,
      itemPrice: Number(form.itemPrice)||0,
    };
    onSubmit?.(payload);
    // reset soft
    setForm((s)=>({ ...s, contacted:"", replied:"", closed:"", sales:"", orderCode:"", price:"", itemPrice:"", note:"" }));
  };

  return (
    <div className="grid gap-3">
      {/* Hàng 1: chọn người + ngày */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-600">Thành viên</label>
          <select className="w-full p-2 border rounded" value={form.memberId} onChange={(e)=>onChange('memberId', e.target.value)}>
            {members.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Ngày báo cáo</label>
          <input type="date" className="w-full p-2 border rounded" value={form.date} onChange={(e)=>onChange('date', e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-gray-600">Nền tảng bán hàng</label>
          <select className="w-full p-2 border rounded" value={form.platform} onChange={(e)=>onChange('platform', e.target.value)}>
            <option value="">-- chọn --</option>
            {options.platform.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Trạng thái</label>
          <select className="w-full p-2 border rounded" value={form.status} onChange={(e)=>onChange('status', e.target.value)}>
            <option value="">-- chọn --</option>
            {options.status.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Hàng 2: sản phẩm / kho / mã đơn */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-600">Sản phẩm</label>
          <select className="w-full p-2 border rounded" value={form.product} onChange={(e)=>onChange('product', e.target.value)}>
            <option value="">-- chọn --</option>
            {options.product.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Xuất kho</label>
          <select className="w-full p-2 border rounded" value={form.warehouse} onChange={(e)=>onChange('warehouse', e.target.value)}>
            <option value="">-- chọn --</option>
            {options.warehouse.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Mã đơn hàng</label>
          <input className="w-full p-2 border rounded" placeholder="HD-00123" value={form.orderCode} onChange={(e)=>onChange('orderCode', e.target.value)}/>
        </div>
        <div>
          <label className="text-xs text-gray-600">Ngày đặt hàng</label>
          <input type="date" className="w-full p-2 border rounded" value={form.orderDate} onChange={(e)=>onChange('orderDate', e.target.value)}/>
        </div>
      </div>

      {/* Hàng 3: số liệu KPI */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Field label="Tiếp cận *"   value={form.contacted} onChange={(v)=>onChange('contacted', v)} type="number"/>
        <Field label="Phản hồi"     value={form.replied}   onChange={(v)=>onChange('replied', v)}   type="number"/>
        <Field label="Chốt"         value={form.closed}    onChange={(v)=>onChange('closed', v)}    type="number"/>
        <Field label="Doanh số (VNĐ) *" value={form.sales} onChange={(v)=>onChange('sales', v)} type="number"/>
        <Field label="Giá (đơn)" value={form.price} onChange={(v)=>onChange('price', v)} type="number"/>
        <Field label="Giá từng SP" value={form.itemPrice} onChange={(v)=>onChange('itemPrice', v)} type="number"/>
      </div>

      {/* Hàng 4: khách hàng */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Tên KH" value={form.customerName} onChange={(v)=>onChange('customerName', v)} />
        <Field label="Link FB" value={form.fbLink} onChange={(v)=>onChange('fbLink', v)} />
        <Field label="Địa chỉ" value={form.address} onChange={(v)=>onChange('address', v)} />
      </div>

      <div>
        <label className="text-xs text-gray-600">Ghi chú</label>
        <textarea className="w-full p-2 border rounded" rows={3} value={form.note} onChange={(e)=>onChange('note', e.target.value)} placeholder="Ghi chú nội bộ, lưu ý chất lượng lead, v.v."/>
      </div>

      <button onClick={submit} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2 rounded-lg">➕ Thêm báo cáo</button>
    </div>
  );
}

function Field({ label, value, onChange, type="text" }){
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      <input type={type} className="w-full p-2 border rounded" value={value} onChange={(e)=>onChange(e.target.value)} />
    </div>
  );
}

// ===== LEADER PAGE =====
function LeaderPage(){
  // TODO: thay bằng fetch từ backend
  const [options] = useState(DEFAULT_OPTIONS);
  const allMembers = SEED_MEMBERS;
  const leader = allMembers.find(m=>m.role === "leader");
  const membersWithoutLeader = allMembers.filter(m=>m.id !== leader.id);

  // Cấu hình KPI
  const [config, setConfig] = useState({
    startDate: toISO("2025-10-14"),
    endDate: toISO("2026-01-19"),
    totalTarget: 25_000_000_000,
    aov: 3_000_000,
    replyRate: 0.2,
    convRate: 0.1,
  });

  // Báo cáo mẫu (mock)
  const [reports, setReports] = useState([
    { id:1, date: toISO(new Date()), memberId: 1, contacted: 20, replied: 6, closed: 2, sales: 60_000_000 },
    { id:2, date: toISO(new Date()), memberId: 2, contacted: 15, replied: 5, closed: 1, sales: 30_000_000 },
  ]);

  // KPI calc
  const kpi = useMemo(()=>{
    const teamCount = allMembers.length;
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    // tính ngày làm việc (T2–T7)
    const workdays = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      if (d.getDay() !== 0) workdays.push(new Date(d));
    }
    const totalWorkdays = workdays.length || 1;
    const perMemberTarget = config.totalTarget / teamCount;
    const dailyPerMember = perMemberTarget / totalWorkdays;
    const weeklyPerMember = dailyPerMember * 6; // T2–T7
    const dealsPerDay = config.aov > 0 ? dailyPerMember / config.aov : 0;
    const requiredReplied = config.convRate > 0 ? dealsPerDay / config.convRate : 0;
    const requiredContacted = config.replyRate > 0 ? requiredReplied / config.replyRate : 0;
    return { totalWorkdays, perMemberTarget, dailyPerMember, weeklyPerMember, dealsPerDay, requiredReplied, requiredContacted };
  }, [config, allMembers.length]);

  // Submit báo cáo (leader cũng có thể nhập)
  const addReport = (payload) => {
    setReports((prev)=>[ { id: Date.now(), ...payload }, ...prev ]);
  };

  // Lọc team không gồm leader trong phần tổng hợp theo yêu cầu
  const reportsForOverview = reports.filter(r=> r.memberId !== (leader?.id));
  const membersForOverview = membersWithoutLeader;

  return (
    <div className="grid gap-6">
      {/* Cấu hình KPI */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold"><Cog/> Cấu hình KPI (Leader – {leader?.name})</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Field label="Ngày bắt đầu" value={config.startDate} onChange={(v)=>setConfig(s=>({...s, startDate:v}))} type="date"/>
          <Field label="Ngày kết thúc" value={config.endDate} onChange={(v)=>setConfig(s=>({...s, endDate:v}))} type="date"/>
          <Field label="Target tổng (VNĐ)" value={config.totalTarget} onChange={(v)=>setConfig(s=>({...s, totalTarget:Number(v)||0}))} type="number"/>
          <Field label="AOV – Giá trị TB đơn (VNĐ)" value={config.aov} onChange={(v)=>setConfig(s=>({...s, aov:Number(v)||0}))} type="number"/>
          <Field label="Tỷ lệ phản hồi (0–1)" value={config.replyRate} onChange={(v)=>setConfig(s=>({...s, replyRate:Math.min(1,Math.max(0,Number(v))) }))} type="number"/>
          <Field label="Tỷ lệ chuyển đổi (0–1)" value={config.convRate} onChange={(v)=>setConfig(s=>({...s, convRate:Math.min(1,Math.max(0,Number(v))) }))} type="number"/>
        </div>
        <div className="mt-4">
          <KPIQuickCards
            totalTarget={config.totalTarget}
            perMemberTarget={kpi.perMemberTarget}
            dailyPerMember={kpi.dailyPerMember}
            weeklyPerMember={kpi.weeklyPerMember}
            requiredContacted={kpi.requiredContacted}
            requiredReplied={kpi.requiredReplied}
            dealsPerDay={kpi.dealsPerDay}
          />
        </div>
      </div>

      {/* Tổng quan team (3 thành viên ngoài Leader) */}
      <TeamOverview members={membersForOverview} reports={reportsForOverview} totalTarget={config.totalTarget * (membersForOverview.length / allMembers.length)} />

      {/* Form báo cáo (leader có thể nhập giúp, có option) */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-4"><ClipboardList/> Báo cáo nhanh</div>
        <ReportForm members={allMembers} options={options} onSubmit={addReport} />
      </div>

      {/* Bảng log gần nhất */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-3"><FileText/> Lịch sử báo cáo gần nhất</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Ngày</th>
                <th className="p-2">Thành viên</th>
                <th className="p-2 text-right">Tiếp cận</th>
                <th className="p-2 text-right">Phản hồi</th>
                <th className="p-2 text-right">Chốt</th>
                <th className="p-2 text-right">Doanh số</th>
                <th className="p-2">Trạng thái</th>
                <th className="p-2">Nền tảng</th>
                <th className="p-2">Sản phẩm</th>
                <th className="p-2">Xuất kho</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0,10).map((r)=>{
                const mem = allMembers.find(m=>m.id===r.memberId);
                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2 font-semibold">{mem?.name}</td>
                    <td className="p-2 text-right">{r.contacted}</td>
                    <td className="p-2 text-right">{r.replied}</td>
                    <td className="p-2 text-right">{r.closed}</td>
                    <td className="p-2 text-right text-green-700 font-bold">{fmtMoneyShort(r.sales)}</td>
                    <td className="p-2">{r.status || "-"}</td>
                    <td className="p-2">{r.platform || "-"}</td>
                    <td className="p-2">{r.product || "-"}</td>
                    <td className="p-2">{r.warehouse || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== MEMBER PAGE =====
function MemberPage(){
  const [options] = useState(DEFAULT_OPTIONS);
  const allMembers = SEED_MEMBERS;
  const leader = allMembers.find(m=>m.role === "leader");
  const membersForMemberPage = allMembers.filter(m=>m.id !== leader.id); // chỉ 3 người ngoài Leader

  // Config chỉ hiển thị để biết (không cho member chỉnh ở UI demo)
  const [config] = useState({ totalTarget: 25_000_000_000, aov: 3_000_000, replyRate: 0.2, convRate: 0.1, startDate: toISO("2025-10-14"), endDate: toISO("2026-01-19") });

  // Báo cáo (mock)
  const [reports, setReports] = useState([
    { id:1, date: toISO(new Date()), memberId: 1, contacted: 10, replied: 3, closed: 1, sales: 30_000_000 },
  ]);

  // KPI calc (chỉ để hiện cards)
  const kpi = useMemo(()=>{
    const teamCount = allMembers.length;
    // ngày làm việc
    const start = new Date("2025-10-14");
    const end = new Date("2026-01-19");
    const workdays = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) if (d.getDay() !== 0) workdays.push(new Date(d));
    const totalWorkdays = workdays.length || 1;
    const perMemberTarget = config.totalTarget / teamCount;
    const dailyPerMember = perMemberTarget / totalWorkdays;
    const weeklyPerMember = dailyPerMember * 6;
    const dealsPerDay = config.aov > 0 ? dailyPerMember / config.aov : 0;
    const requiredReplied = config.convRate > 0 ? dealsPerDay / config.convRate : 0;
    const requiredContacted = config.replyRate > 0 ? requiredReplied / config.replyRate : 0;
    return { perMemberTarget, dailyPerMember, weeklyPerMember, dealsPerDay, requiredReplied, requiredContacted };
  }, [config, allMembers.length]);

  const addReport = (payload) => setReports((prev)=>[{ id: Date.now(), ...payload }, ...prev]);

  return (
    <div className="grid gap-6">
      {/* KPI cards để member biết mục tiêu/ngày */}
      <KPIQuickCards
        totalTarget={config.totalTarget}
        perMemberTarget={kpi.perMemberTarget}
        dailyPerMember={kpi.dailyPerMember}
        weeklyPerMember={kpi.weeklyPerMember}
        requiredContacted={kpi.requiredContacted}
        requiredReplied={kpi.requiredReplied}
        dealsPerDay={kpi.dealsPerDay}
      />

      {/* Form báo cáo (giống leader) */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-4"><ClipboardList/> Báo cáo hằng ngày</div>
        <ReportForm members={membersForMemberPage} options={options} onSubmit={addReport} />
      </div>

      {/* Bảng xem 3 thành viên ngoài leader */}
      <TeamOverview members={membersForMemberPage} reports={reports} totalTarget={config.totalTarget * (membersForMemberPage.length / allMembers.length)} />

      {/* Lịch sử gọn */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-3"><FileText/> Lịch sử gần đây</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Ngày</th>
                <th className="p-2">Thành viên</th>
                <th className="p-2 text-right">Tiếp cận</th>
                <th className="p-2 text-right">Phản hồi</th>
                <th className="p-2 text-right">Chốt</th>
                <th className="p-2 text-right">Doanh số</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0,10).map((r)=>{
                const mem = SEED_MEMBERS.find(m=>m.id===r.memberId);
                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2 font-semibold">{mem?.name}</td>
                    <td className="p-2 text-right">{r.contacted}</td>
                    <td className="p-2 text-right">{r.replied}</td>
                    <td className="p-2 text-right">{r.closed}</td>
                    <td className="p-2 text-right text-green-700 font-bold">{fmtMoneyShort(r.sales)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
