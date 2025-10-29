import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from "react-router-dom";
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

// API base – hỗ trợ triển khai tách FE/API: đặt VITE_API_URL trong .env.production
const API_BASE = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL)
  ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  : '';
const apiFetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    return fetch(`${API_BASE}${input}`, init);
  }
  return fetch(input, init);
};

// Mock options (có thể đổi sau khi nối backend)
const DEFAULT_OPTIONS = {
  statuses: ["Đã giao hàng", "Đang sản xuất", "24H xử lý", "Chờ thanh toán", "Hủy"],
  platforms: ["SẾP", "BNI", "Cá nhân", "Facebook", "Shopee", "Website"],
  products: ["Long Mã", "Mã Thượng Vân", "Mã Đáo Thành Công", "Vó Ngựa Nước Nam"],
  warehouses: ["SG", "HN", "Xưởng"],
};

// Seed team (4 người; leader = Mỹ Anh)
const SEED_MEMBERS = [
  { id: 1, name: "Vũ", color: COLORS[0] },
  { id: 2, name: "Quỳnh", color: COLORS[1] },
  { id: 3, name: "Mỹ Anh", color: COLORS[2], role: "leader" },
  { id: 4, name: "Ngân", color: COLORS[3] },
];

// Normalize report row from API (pg lowercases unquoted columns)
function normalizeReport(r){
  if (!r) return r;
  const n = { ...r };
  // prefer camelCase - xử lý cả memberid (lowercase từ postgres)
  const rawMemberId = r.memberId ?? r.memberid ?? r.member_id;
  n.memberId = rawMemberId != null ? Number(rawMemberId) : undefined;
  n.itemPrice = Number(r.itemPrice ?? r.itemprice ?? r.item_price) || null;
  n.contacted = Number(r.contacted ?? r.reach) || 0;
  n.replied = Number(r.replied ?? r.responses) || 0;
  n.closed = Number(r.closed ?? r.deals) || 0;
  n.sales = Number(r.sales ?? r.revenue) || 0;
  n.price = Number(r.price) || 0;
  console.log('🔍 Normalize:', { 
    rawMemberId, 
    'r.memberid': r.memberid,
    'n.memberId': n.memberId,
    originalKeys: Object.keys(r)
  });
  return n;
}

// ==== App Shell ====
function AppShell({ children, title }) {
  const nav = useNavigate();
  const location = useLocation();
  const isMemberPage = location.pathname.startsWith('/member');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Target className="text-blue-600" /> KPI Tết 2026
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            {!isMemberPage && <Link to="/leader" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1"><ShieldCheck size={16}/> Leader</Link>}
            {!isMemberPage && <Link to="/member/login" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1"><Users size={16}/> Member</Link>}
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
        <Route path="/member/login" element={<AppShell title="Member Login"><MemberLoginPage/></AppShell>} />
        <Route path="/member/:id" element={<AppShell title="Member"><MemberPage/></AppShell>} />
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
function KPIQuickCards({ totalTarget, perMemberTarget, dailyPerMember, weeklyPerMember, requiredContacted, requiredReplied, dealsPerDay, reports, config, monthTarget, selectedMonth }){
  // Tính toán dữ liệu thực từ reports
  const totalSalesAchieved = reports.reduce((sum, r) => sum + (Number(r.sales) || 0), 0);
  const percentTotal = totalTarget > 0 ? (totalSalesAchieved / totalTarget * 100) : 0;
  
  // Progress bar color based on percentage
  const getProgressColor = (pct) => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Breakdown tooltip (dynamic for selected month)
  const breakdown = selectedMonth ? `Tháng ${selectedMonth}: ${fmtMoneyShort(monthTarget || 0)}` : '';
  
  // Tính target tháng được chọn
  const currentMonth = selectedMonth || new Date().toISOString().slice(0,7);
  const monthReports = reports.filter(r => r.date && r.date.startsWith(currentMonth));
  const salesMonth = monthReports.reduce((sum, r) => sum + (Number(r.sales) || 0), 0);
  const targetMonth = Number(monthTarget || 0);
  const percentMonth = targetMonth > 0 ? (salesMonth / targetMonth * 100) : 0;
  
  // Hiệu suất/ngày (toàn bộ kỳ)
  const daysWithData = [...new Set(reports.filter(r => r.date).map(r => r.date))].length;
  const avgPerDay = daysWithData > 0 ? (totalSalesAchieved / daysWithData) : 0;
  const planPerDay = dailyPerMember;
  const delta = planPerDay > 0 ? ((avgPerDay - planPerDay) / planPerDay * 100) : 0;
  
  // Phễu khách hàng
  const totalReach = reports.reduce((sum, r) => sum + (Number(r.contacted) || 0), 0);
  const totalResponses = reports.reduce((sum, r) => sum + (Number(r.replied) || 0), 0);
  const totalDeals = reports.reduce((sum, r) => sum + (Number(r.closed) || 0), 0);
  
  // Dự báo cho tháng được chọn (ước tính ngày còn lại trong tháng)
  const year = Number(currentMonth.slice(0,4));
  const monthIndex = Number(currentMonth.slice(5,7)) - 1; // 0-based
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysWithDataMonth = [...new Set(monthReports.map(r => r.date))].length;
  const avgPerDayMonth = daysWithDataMonth > 0 ? (salesMonth / daysWithDataMonth) : 0;
  const daysRemaining = Math.max(0, daysInMonth - daysWithDataMonth);
  const forecastMonth = avgPerDayMonth > 0 && targetMonth > 0 ? ((salesMonth + avgPerDayMonth * daysRemaining) / targetMonth * 100) : percentMonth;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Ô 1: Tiến độ đạt toàn kỳ */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-3">
          <Users className="text-lg text-blue-600" />
          <span>Tiến độ đạt toàn kỳ</span>
        </div>
        <div className="text-gray-900" title={breakdown}>
          <div className="text-3xl font-bold">{percentTotal.toFixed(1)}%</div>
          <div className="text-sm font-normal text-gray-600 mt-1">
            {fmtMoneyShort(totalSalesAchieved)} / {fmtMoneyShort(totalTarget)}
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full ${getProgressColor(percentTotal)}`} style={{ width: `${Math.min(percentTotal, 100)}%` }} />
          </div>
        </div>
        <div className="text-gray-600 mt-2 text-xs">
          Target tổng tham khảo (chiến dịch)
        </div>
      </div>

      {/* Ô 2: Target tháng (theo cấu hình tháng) */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-3">
          <Calendar className="text-lg text-emerald-600" />
          <span>Target tháng {currentMonth}</span>
        </div>
        <div className="text-gray-900">
          <div className="text-3xl font-bold">{percentMonth.toFixed(1)}%</div>
          <div className="text-sm font-normal text-gray-600 mt-1">
            {fmtMoneyShort(salesMonth)} / {fmtMoneyShort(targetMonth)}
          </div>
        </div>
        <div className="text-gray-600 mt-2 text-xs">
          {salesMonth > targetMonth ? (
            <span className="text-green-600 font-semibold">🔥 Vượt target!</span>
          ) : salesMonth > targetMonth * 0.8 ? (
            <span className="text-yellow-600">Gần đạt target</span>
          ) : (
            <span>Còn {fmtMoneyShort(Math.max(0, targetMonth - salesMonth))}</span>
          )}
        </div>
      </div>

      {/* Ô 3: Hiệu suất/ngày */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-3">
          <DollarSign className="text-lg text-orange-600" />
          <span>Hiệu suất/ngày</span>
        </div>
        <div className="text-gray-900">
          {avgPerDay > 0 ? (
            <>
              <div className="text-3xl font-bold">{fmtMoneyShort(avgPerDay)}</div>
              <div className="text-sm font-normal text-gray-600 mt-1">
                Chuẩn: {fmtMoneyShort(planPerDay)}
                {delta !== 0 && (
                  <span className={`ml-2 ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">Chưa đủ dữ liệu</div>
          )}
        </div>
      </div>

      {/* Ô 4: Phễu */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-3">
          <BarChart2 className="text-lg text-purple-600" />
          <span>Tổng quan phễu</span>
        </div>
        <div className="text-gray-900 text-sm">
          <div>Tiếp cận: <span className="font-bold">{totalReach}</span></div>
          <div>Phản hồi: <span className="font-bold">{totalResponses}</span></div>
          <div>Đơn thành công: <span className="font-bold">{totalDeals}</span></div>
        </div>
      </div>
    </div>
  );
}


// Component phân bổ target cho từng thành viên (chỉ Leader)
function TargetAllocationPanel({ members, monthlyTarget, allocation, setAllocation, selectedMonth }){
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const totalPercent = Object.values(allocation).reduce((sum, a) => sum + (Number(a.percent) || 0), 0);
  const isValid = Math.abs(totalPercent - 100) < 0.01;

  const saveAllocation = async () => {
    if (!isValid) {
      setSaveMessage('❌ Tổng % phải bằng 100%');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    try {
      setSaving(true);
      const res = await apiFetch('/api/target-allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, allocation })
      });

      if (!res.ok) throw new Error('Save failed');
      
      setSaveMessage('✅ Đã lưu thành công cho tháng ' + selectedMonth + '!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      console.error('Failed to save target allocation', e);
      setSaveMessage('❌ Lưu thất bại');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updatePercent = (memberId, percent) => {
    setAllocation(prev => ({
      ...prev,
      [memberId]: { percent: Number(percent) || 0 }
    }));
  };

  // Sắp xếp: Leader lên đầu
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'leader') return -1;
    if (b.role === 'leader') return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            📊 Phân bổ Target - {new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Target tháng này: <span className="font-bold text-blue-600">{fmtMoneyShort(monthlyTarget)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-sm font-bold px-3 py-1 rounded ${isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Tổng: {totalPercent.toFixed(1)}%
          </div>
          <button
            onClick={saveAllocation}
            disabled={!isValid || saving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
      </div>
      
      {saveMessage && (
        <div className={`mb-4 p-3 rounded text-sm ${saveMessage.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {saveMessage}
        </div>
      )}

      
      {!isValid && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ Tổng phần trăm phải bằng 100%. Hiện tại: {totalPercent.toFixed(1)}%
        </div>
      )}

      <div className="grid gap-3">
        {sortedMembers.map(m => {
          const isLeader = m.role === 'leader';
          const percent = allocation[m.id]?.percent || 0;
          const amount = (percent / 100) * monthlyTarget;
          
          return (
            <div 
              key={m.id} 
              className={`p-4 border-2 rounded-lg ${isLeader ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className={`font-semibold mb-1 flex items-center gap-1 ${isLeader ? 'text-amber-800' : ''}`}>
                    {isLeader && <span>👑</span>}
                    {m.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    Target: <span className="font-bold text-blue-600">{fmtMoneyShort(amount)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0.0"
                    value={percent || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Chỉ cho phép số và dấu chấm
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        const num = parseFloat(val) || 0;
                        if (num >= 0 && num <= 100) {
                          updatePercent(m.id, val);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Khi blur, format lại số
                      const num = parseFloat(e.target.value) || 0;
                      updatePercent(m.id, num);
                    }}
                    className={`w-24 p-2 border-2 rounded text-right font-bold ${isLeader ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}`}
                  />
                  <span className="text-sm font-semibold">%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamOverview({ members, reports, totalTarget, targetAllocation }){
  const perMember = totalTarget / members.length;
  const byMember = members.map(m => {
    const rs = reports.filter(r => r.memberId === m.id);
    const totalSales = rs.reduce((s,r)=>s + r.sales, 0);
    const totalContacted = rs.reduce((s,r)=>s + r.contacted, 0);
    const totalReplied = rs.reduce((s,r)=>s + r.replied, 0);
    
    // Sử dụng target allocation nếu có, không thì chia đều
    const memberTarget = targetAllocation?.[m.id] || perMember;
    const progress = (totalSales / memberTarget) * 100;
    const convRate = totalContacted ? (totalReplied / totalContacted) * 100 : 0;
    return { ...m, totalSales, totalContacted, totalReplied, progress, convRate, remaining: Math.max(memberTarget - totalSales, 0), memberTarget };
  });
  
  // Sắp xếp: Leader lên đầu
  const sortedMembers = [...byMember].sort((a, b) => {
    if (a.role === 'leader') return -1;
    if (b.role === 'leader') return 1;
    return 0;
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
          {sortedMembers.map((m)=> {
            const isLeader = m.role === 'leader';
            return (
              <div 
                key={m.id} 
                className={`p-4 border-2 rounded-lg transition-all ${isLeader ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-400 shadow-lg ring-2 ring-yellow-300' : ''}`}
                style={{ borderColor: isLeader ? '#fbbf24' : m.color }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`font-semibold flex items-center gap-1 ${isLeader ? 'text-amber-800' : ''}`}>
                    {isLeader && <span className="text-lg">👑</span>}
                    {m.name}
                  </div>
                  <span 
                    className={`text-xs px-2 py-1 rounded-full ${isLeader ? 'bg-yellow-200 text-yellow-800 font-bold' : 'bg-gray-100'}`}
                    style={!isLeader ? { color: m.color } : {}}
                  >
                    {m.progress.toFixed(1)}%
                  </span>
                </div>
                <div className={`w-full rounded h-2 mb-2 ${isLeader ? 'bg-yellow-200' : 'bg-gray-200'}`}>
                  <div 
                    className="h-2 rounded" 
                    style={{ 
                      width: `${Math.min(m.progress,100)}%`, 
                      background: isLeader ? 'linear-gradient(to right, #f59e0b, #d97706)' : m.color 
                    }} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Đã đạt: <b>{fmtMoneyShort(m.totalSales)}</b></div>
                  <div>Còn lại: <b>{fmtMoneyShort(m.remaining)}</b></div>
                  <div>Tiếp cận: <b>{m.totalContacted}</b></div>
                  <div>Phản hồi: <b>{m.totalReplied}</b> ({m.convRate.toFixed(1)}%)</div>
                </div>
              </div>
            );
          })}
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
    phone: "",
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
    setForm((s)=>({ ...s, contacted:"", replied:"", closed:"", sales:"", orderCode:"", price:"", itemPrice:"", note:"", phone: "" }));
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
            {options.platforms.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Trạng thái</label>
          <select className="w-full p-2 border rounded" value={form.status} onChange={(e)=>onChange('status', e.target.value)}>
            <option value="">-- chọn --</option>
            {options.statuses.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Hàng 2: sản phẩm / kho / mã đơn */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-600">Sản phẩm</label>
          <select className="w-full p-2 border rounded" value={form.product} onChange={(e)=>onChange('product', e.target.value)}>
            <option value="">-- chọn --</option>
            {options.products.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Xuất kho</label>
          <select className="w-full p-2 border rounded" value={form.warehouse} onChange={(e)=>onChange('warehouse', e.target.value)}>
            <option value="">-- chọn --</option>
            {options.warehouses.map(o=> <option key={o} value={o}>{o}</option>)}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Tên KH" value={form.customerName} onChange={(v)=>onChange('customerName', v)} />
        <Field label="Link FB" value={form.fbLink} onChange={(v)=>onChange('fbLink', v)} />
        <Field label="Địa chỉ" value={form.address} onChange={(v)=>onChange('address', v)} />
        <Field label="Số điện thoại" value={form.phone} onChange={(v)=>onChange('phone', v)} />
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
  const [options] = useState(DEFAULT_OPTIONS);
  const [allMembers, setAllMembers] = useState([]);
  const leader = allMembers.find(m=>m.role === "leader");
  const membersWithoutLeader = allMembers.filter(m=>m.id !== leader?.id);

  // State cho month selector
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7); // YYYY-MM format
  });
  // Tự động theo dõi tháng hiện tại + làm mới dữ liệu
  const [autoFollowCurrentMonth, setAutoFollowCurrentMonth] = useState(true);
  const [liveRefresh, setLiveRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(new Date());

  // Đồng hồ hiển thị thời gian hiện tại (cập nhật mỗi giây)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load members từ API
  useEffect(() => {
    (async () => {
      try {
  const res = await apiFetch('/api/members');
        const data = await res.json();
        setAllMembers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load members', e);
        setAllMembers(SEED_MEMBERS); // Fallback
      }
    })();
  }, []);

  // Cấu hình KPI (chỉ nhập target và kỳ hạn)
  const [config, setConfig] = useState({
    startDate: toISO("2025-10-14"),
    endDate: toISO("2026-01-19"),
    totalTarget: 25_000_000_000,
  });

  // Team target theo tháng
  const [teamTarget, setTeamTarget] = useState(0);
  const [editingTeamTarget, setEditingTeamTarget] = useState(false);
  const [tempTeamTarget, setTempTeamTarget] = useState(0);

  // Phân bổ target theo % cho từng thành viên (mặc định chia đều)
  const [targetAllocation, setTargetAllocation] = useState(() => {
    const defaultPercent = 100 / 4; // 4 members default
    const defaultAllocation = {};
    for (let i = 1; i <= 4; i++) {
      defaultAllocation[i] = { percent: defaultPercent };
    }
    return defaultAllocation;
  });

  // Load team target từ database khi selectedMonth thay đổi
  useEffect(() => {
    (async () => {
      try {
  const res = await apiFetch(`/api/team-target/${selectedMonth}`);
        const data = await res.json();
        setTeamTarget(data.target || 0);
        setTempTeamTarget(data.target || 0);
      } catch (e) {
        console.error('Failed to load team target', e);
      }
    })();
  }, [selectedMonth]);

  // Load target allocation từ database khi selectedMonth thay đổi
  useEffect(() => {
    (async () => {
      try {
  const res = await apiFetch(`/api/target-allocation/${selectedMonth}`);
        const data = await res.json();
        
        // Nếu có data từ DB, dùng nó
        if (Object.keys(data).length > 0) {
          setTargetAllocation(data);
        } else {
          // Reset về default nếu chưa có data cho tháng này
          const defaultPercent = 100 / 4;
          const defaultAllocation = {};
          for (let i = 1; i <= 4; i++) {
            defaultAllocation[i] = { percent: defaultPercent };
          }
          setTargetAllocation(defaultAllocation);
        }
      } catch (e) {
        console.error('Failed to load target allocation', e);
      }
    })();
  }, [selectedMonth]);

  // Auto-follow tháng hệ thống: nếu bật, tự cập nhật selectedMonth mỗi phút
  useEffect(() => {
    if (!autoFollowCurrentMonth) return;
    const sync = () => {
      const cur = new Date().toISOString().slice(0, 7);
      setSelectedMonth((prev) => (prev !== cur ? cur : prev));
    };
    sync(); // đồng bộ ngay khi bật
    const id = setInterval(sync, 60_000);
    return () => clearInterval(id);
  }, [autoFollowCurrentMonth]);

  // Làm mới tự động: nếu bật, poll dữ liệu định kỳ (30s)
  useEffect(() => {
    if (!liveRefresh) return;
    let cancelled = false;
    const tick = async () => {
      try {
        // Team target
  const resT = await apiFetch(`/api/team-target/${selectedMonth}`);
        const dataT = await resT.json();
        if (!cancelled) {
          setTeamTarget(dataT.target || 0);
          setTempTeamTarget(dataT.target || 0);
        }

        // Target allocation
  const resA = await apiFetch(`/api/target-allocation/${selectedMonth}`);
        const dataA = await resA.json();
        if (!cancelled) {
          if (Object.keys(dataA).length > 0) {
            setTargetAllocation(dataA);
          } else {
            const defaultPercent = 100 / 4;
            const defaultAllocation = {};
            for (let i = 1; i <= 4; i++) defaultAllocation[i] = { percent: defaultPercent };
            setTargetAllocation(defaultAllocation);
          }
        }

        // Reports
        await loadReports();

        if (!cancelled) setLastUpdated(new Date().toISOString());
      } catch (e) {
        console.error('Auto refresh error', e);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [liveRefresh, selectedMonth]);

  // Báo cáo lấy từ API (load TẤT CẢ, không filter theo tháng)
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // report object when editing
  const [filter, setFilter] = useState({ memberId: '', start: '', end: '', phone: '', order: 'desc' });
  
  const loadReports = async () => {
    try{
      setLoading(true);
  const res = await apiFetch('/api/reports');
      const data = await res.json();
      const list = Array.isArray(data) ? data.map(normalizeReport) : [];
      setReports(list);
    }catch(e){
      console.error('load reports', e);
    }finally{
      setLoading(false);
    }
  };
  
  useEffect(()=>{
    loadReports();
  }, []);

  // Tính toán các chỉ số thực tế từ TẤT CẢ báo cáo (không filter theo tháng)
  const realMetrics = useMemo(()=>{
    const totalRevenue = reports.reduce((sum, r) => sum + (Number(r.sales) || 0), 0);
    const totalDeals = reports.reduce((sum, r) => sum + (Number(r.closed) || 0), 0);
    const totalReplied = reports.reduce((sum, r) => sum + (Number(r.replied) || 0), 0);
    const totalContacted = reports.reduce((sum, r) => sum + (Number(r.contacted) || 0), 0);

    // Công thức tính toán từ dữ liệu thực
    const aov = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    const replyRate = totalContacted > 0 ? totalReplied / totalContacted : 0;
    const convRate = totalReplied > 0 ? totalDeals / totalReplied : 0;

    return { aov, replyRate, convRate, totalRevenue, totalDeals, totalReplied, totalContacted };
  }, [reports]);

  // KPI calc - sử dụng realMetrics thay vì config
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
    
    // Sử dụng realMetrics từ dữ liệu thực
    const dealsPerDay = realMetrics.aov > 0 ? dailyPerMember / realMetrics.aov : 0;
    const requiredReplied = realMetrics.convRate > 0 ? dealsPerDay / realMetrics.convRate : 0;
    const requiredContacted = realMetrics.replyRate > 0 ? requiredReplied / realMetrics.replyRate : 0;
    
    return { totalWorkdays, perMemberTarget, dailyPerMember, weeklyPerMember, dealsPerDay, requiredReplied, requiredContacted };
  }, [config, allMembers.length, realMetrics]);

  // Submit báo cáo (leader cũng có thể nhập)
  const addReport = async (payload) => {
    try{
  const res = await apiFetch('/api/reports', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if(!res.ok) throw new Error('create failed');
      const created = normalizeReport(await res.json());
      setReports(prev=>[created, ...prev]);
    }catch(e){
      console.error('add report', e);
      alert('Không lưu được báo cáo');
    }
  };

  const saveEdit = async (r) => {
    try{
  const res = await apiFetch(`/api/reports/${r.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(r) });
      if(!res.ok) throw new Error('update failed');
      const updated = normalizeReport(await res.json());
      setReports(prev=> prev.map(x=> x.id===updated.id ? updated : x));
      setEditing(null);
    }catch(e){
      console.error('edit report', e);
      alert('Không cập nhật được báo cáo');
    }
  };

  const removeReport = async (id) => {
    if(!confirm('Xóa báo cáo này?')) return;
    try{
  const res = await apiFetch(`/api/reports/${id}`, { method:'DELETE' });
      if(!res.ok) throw new Error('delete failed');
      setReports(prev=> prev.filter(r=> r.id !== id));
    }catch(e){
      console.error('delete report', e);
      alert('Không xóa được báo cáo');
    }
  };

  // Bao gồm cả Leader trong phần tổng hợp
  const reportsForOverview = reports; // Lấy tất cả báo cáo (bao gồm Leader)
  const membersForOverview = allMembers; // Hiển thị tất cả thành viên (bao gồm Leader)

  // Tính target allocation amounts từ % và team target của tháng được chọn
  const targetAllocationAmounts = useMemo(() => {
    return allMembers.reduce((acc, m) => {
      const percent = targetAllocation[m.id]?.percent || 0;
      acc[m.id] = (percent / 100) * teamTarget;
      return acc;
    }, {});
  }, [targetAllocation, allMembers, teamTarget]);
  
  // Lọc + sắp xếp cho bảng lịch sử leader
  const filteredReports = useMemo(()=>{
    const phone = (filter.phone || '').trim().toLowerCase();
    const memId = filter.memberId ? Number(filter.memberId) : null;
    const start = filter.start || '';
    const end = filter.end || '';
    let list = reports.filter(r => {
      if (memId && Number(r.memberId) !== memId) return false;
      if (start && (r.date || '') < start) return false;
      if (end && (r.date || '') > end) return false;
      if (phone && !String(r.phone || '').toLowerCase().includes(phone)) return false;
      return true;
    });
    list.sort((a,b)=>{
      const ca = a.date || '';
      const cb = b.date || '';
      return filter.order === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
    });
    return list;
  }, [reports, filter]);

  // Loading state
  if (allMembers.length === 0) {
    return <div className="p-6 text-gray-500">Đang tải dữ liệu...</div>;
  }

  // Handler để lưu team target
  const handleSaveTeamTarget = async () => {
    try {
      const res = await apiFetch('/api/team-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, target: tempTeamTarget })
      });
      const data = await res.json();
      if (data.ok) {
        setTeamTarget(tempTeamTarget);
        setEditingTeamTarget(false);
        alert('✅ Đã lưu target team cho tháng ' + selectedMonth);
      }
    } catch (e) {
      console.error('Save team target error', e);
      alert('❌ Lưu target thất bại');
    }
  };

  return (
    <div className="grid gap-6">
      {/* Lịch sử báo cáo */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-bold text-gray-800"><FileText/> Lịch sử báo cáo</div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadReports}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-1"
            >
              {loading ? '⏳' : '🔄'} Refresh
            </button>
            <a href="#leader-quick-form" className="px-3 py-1.5 bg-emerald-600 text-white rounded">Thêm mới</a>
          </div>
        </div>
        {/* Bộ lọc */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-600">Thành viên</label>
            <select className="w-full p-2 border rounded" value={filter.memberId} onChange={(e)=>setFilter(s=>({...s, memberId: e.target.value}))}>
              <option value="">Tất cả</option>
              {allMembers.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Từ ngày</label>
            <input type="date" className="w-full p-2 border rounded" value={filter.start} onChange={(e)=>setFilter(s=>({...s, start: e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Đến ngày</label>
            <input type="date" className="w-full p-2 border rounded" value={filter.end} onChange={(e)=>setFilter(s=>({...s, end: e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Tìm SĐT</label>
            <input className="w-full p-2 border rounded" placeholder="Nhập số điện thoại" value={filter.phone} onChange={(e)=>setFilter(s=>({...s, phone: e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Sắp xếp</label>
            <select className="w-full p-2 border rounded" value={filter.order} onChange={(e)=>setFilter(s=>({...s, order: e.target.value}))}>
              <option value="desc">Mới nhất trước</option>
              <option value="asc">Cũ nhất trước</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mb-2">
          <button className="text-sm px-3 py-1 bg-gray-100 rounded" onClick={()=>setFilter({ memberId:'', start:'', end:'', phone:'', order:'desc' })}>Xóa lọc</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Ngày</th>
                <th className="p-2">Mã đơn</th>
                <th className="p-2">Thành viên</th>
                <th className="p-2">Điện thoại</th>
                <th className="p-2 text-right">Tiếp cận</th>
                <th className="p-2 text-right">Phản hồi</th>
                <th className="p-2 text-right">Chốt</th>
                <th className="p-2 text-right">Doanh số</th>
                <th className="p-2">Trạng thái</th>
                <th className="p-2">Nền tảng</th>
                <th className="p-2">Sản phẩm</th>
                <th className="p-2">Xuất kho</th>
                <th className="p-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.slice(0,50).map((r)=>{
                const mem = allMembers.find(m=>m.id===r.memberId);
                const isEdit = editing && editing.id === r.id;
                return (
                  <tr key={r.id} className="border-b align-top hover:bg-gray-50">
                    <td className="p-2">{isEdit ? <input className="border p-1 rounded" type="date" value={editing.date} onChange={(e)=>setEditing(s=>({...s, date:e.target.value}))}/> : r.date}</td>
                    <td className="p-2 text-blue-600 font-mono text-xs">{isEdit ? <input className="border p-1 rounded w-32" value={editing.orderCode||''} onChange={(e)=>setEditing(s=>({...s, orderCode:e.target.value}))}/> : (r.orderCode || '-')}</td>
                    <td className="p-2 font-semibold">
                      {isEdit ? (
                        <select className="border p-1 rounded" value={editing.memberId} onChange={(e)=>setEditing(s=>({...s, memberId:Number(e.target.value)}))}>
                          {allMembers.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      ) : (mem?.name)}
                    </td>
                    <td className="p-2">{isEdit ? <input className="border p-1 rounded w-40" value={editing.phone||''} onChange={(e)=>setEditing(s=>({...s, phone:e.target.value}))}/> : (r.phone || '-')}</td>
                    <td className="p-2 text-right">{isEdit ? <input className="border p-1 rounded w-20" type="number" value={editing.contacted} onChange={(e)=>setEditing(s=>({...s, contacted:Number(e.target.value)||0}))}/> : r.contacted}</td>
                    <td className="p-2 text-right">{isEdit ? <input className="border p-1 rounded w-20" type="number" value={editing.replied} onChange={(e)=>setEditing(s=>({...s, replied:Number(e.target.value)||0}))}/> : r.replied}</td>
                    <td className="p-2 text-right">{isEdit ? <input className="border p-1 rounded w-20" type="number" value={editing.closed} onChange={(e)=>setEditing(s=>({...s, closed:Number(e.target.value)||0}))}/> : r.closed}</td>
                    <td className="p-2 text-right">{isEdit ? <input className="border p-1 rounded w-28" type="number" value={editing.sales} onChange={(e)=>setEditing(s=>({...s, sales:Number(e.target.value)||0}))}/> : fmtMoneyShort(r.sales)}</td>
                    <td className="p-2">{isEdit ? (
                      <select className="border p-1 rounded" value={editing.status||''} onChange={(e)=>setEditing(s=>({...s, status:e.target.value}))}>
                        <option value="">-- chọn --</option>
                        {options.statuses.map(o=> <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (r.status || '-')}</td>
                    <td className="p-2">{isEdit ? (
                      <select className="border p-1 rounded" value={editing.platform||''} onChange={(e)=>setEditing(s=>({...s, platform:e.target.value}))}>
                        <option value="">-- chọn --</option>
                        {options.platforms.map(o=> <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (r.platform || '-')}</td>
                    <td className="p-2">{isEdit ? (
                      <select className="border p-1 rounded" value={editing.product||''} onChange={(e)=>setEditing(s=>({...s, product:e.target.value}))}>
                        <option value="">-- chọn --</option>
                        {options.products.map(o=> <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (r.product || '-')}</td>
                    <td className="p-2">{isEdit ? (
                      <select className="border p-1 rounded" value={editing.warehouse||''} onChange={(e)=>setEditing(s=>({...s, warehouse:e.target.value}))}>
                        <option value="">-- chọn --</option>
                        {options.warehouses.map(o=> <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (r.warehouse || '-')}</td>
                    <td className="p-2">
                      {isEdit ? (
                        <div className="flex gap-2">
                          <button className="px-2 py-1 bg-emerald-600 text-white rounded" onClick={()=>saveEdit(editing)}>Lưu</button>
                          <button className="px-2 py-1 bg-gray-200 rounded" onClick={()=>setEditing(null)}>Hủy</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>setEditing(r)}>Sửa</button>
                          <button className="px-2 py-1 bg-rose-600 text-white rounded" onClick={()=>removeReport(r.id)}>Xóa</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Cấu hình KPI */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold"><Cog/> Cấu hình KPI (Leader – {leader?.name})</div>
        </div>
        
        {/* Target theo tháng */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            🎯 Target theo từng tháng
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Chọn tháng cấu hình</label>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
              />
              <p className="text-xs text-gray-600 mt-1">
                Đang cấu hình: <span className="font-bold text-blue-600">{new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
              </p>
              <div className="mt-2 text-sm text-gray-700">
                🕒 Thời gian hiện tại: <span className="font-semibold">{now.toLocaleDateString('vi-VN')} {now.toLocaleTimeString('vi-VN')}</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoFollowCurrentMonth}
                    onChange={(e) => setAutoFollowCurrentMonth(e.target.checked)}
                  />
                  <span>Tự theo dõi tháng hiện tại</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={liveRefresh}
                    onChange={(e) => setLiveRefresh(e.target.checked)}
                  />
                  <span>Làm mới dữ liệu tự động (30s)</span>
                </label>
                {lastUpdated && (
                  <div className="text-xs text-gray-500">
                    Cập nhật gần nhất: {new Date(lastUpdated).toLocaleTimeString('vi-VN')}
                  </div>
                )}
              </div>
            </div>

            {/* Team Target for selected month */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">💰 Target team tháng {selectedMonth}</label>
              {editingTeamTarget ? (
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={tempTeamTarget}
                    onChange={(e) => setTempTeamTarget(Number(e.target.value))}
                    className="flex-1 p-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold"
                    placeholder="VNĐ"
                  />
                  <button 
                    onClick={handleSaveTeamTarget}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                  >
                    ✓
                  </button>
                  <button 
                    onClick={() => {
                      setTempTeamTarget(teamTarget);
                      setEditingTeamTarget(false);
                    }}
                    className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-bold"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 bg-white border-2 border-gray-300 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {teamTarget === 0 ? 'Chưa set' : fmtMoneyShort(teamTarget)}
                  </div>
                  <button 
                    onClick={() => setEditingTeamTarget(true)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                  >
                    {teamTarget === 0 ? 'Thiết lập' : 'Sửa'}
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-600 mt-1">
                {teamTarget === 0 ? 'Click "Thiết lập" để nhập target' : 'Target hiện tại cho tháng này'}
              </p>
            </div>
          </div>
        </div>

        {/* Kỳ hạn campaign */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-800 mb-3">📆 Kỳ hạn chiến dịch tổng thể</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Ngày bắt đầu" value={config.startDate} onChange={(v)=>setConfig(s=>({...s, startDate:v}))} type="date"/>
            <Field label="Ngày kết thúc" value={config.endDate} onChange={(v)=>setConfig(s=>({...s, endDate:v}))} type="date"/>
            <Field label="Target tổng chiến dịch (tham khảo)" value={config.totalTarget} onChange={(v)=>setConfig(s=>({...s, totalTarget:Number(v)||0}))} type="number"/>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            💡 Target tổng này chỉ để tham khảo tính KPI. Target thực tế được thiết lập theo từng tháng ở phía trên.
          </p>
        </div>
        
        {/* Chỉ số thực tế tự động tính từ báo cáo */}
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-3">📊 Chỉ số thực tế (tự động từ báo cáo)</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-600 mb-1">AOV – Giá trị TB đơn</div>
              <div className="font-bold text-lg text-purple-700">{fmtMoneyShort(realMetrics.aov)}</div>
              <div className="text-xs text-gray-500 mt-1">= {fmtMoneyShort(realMetrics.totalRevenue)} / {realMetrics.totalDeals} đơn</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Tỷ lệ phản hồi</div>
              <div className="font-bold text-lg text-pink-700">{(realMetrics.replyRate * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">= {realMetrics.totalReplied} / {realMetrics.totalContacted} khách</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Tỷ lệ chuyển đổi</div>
              <div className="font-bold text-lg text-purple-700">{(realMetrics.convRate * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">= {realMetrics.totalDeals} đơn / {realMetrics.totalReplied} phản hồi</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
            ℹ️ <strong>Lưu ý:</strong> KPI tính toán dưới đây dùng để tham khảo. Target thực tế của từng tháng được thiết lập ở phía trên và phần "Phân bổ Target" phía dưới.
          </div>
          <KPIQuickCards
            totalTarget={config.totalTarget}
            perMemberTarget={kpi.perMemberTarget}
            dailyPerMember={kpi.dailyPerMember}
            weeklyPerMember={kpi.weeklyPerMember}
            requiredContacted={kpi.requiredContacted}
            requiredReplied={kpi.requiredReplied}
            dealsPerDay={kpi.dealsPerDay}
            reports={reports}
            config={config}
            monthTarget={teamTarget}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>

  {/* Phân bổ target tháng cho từng thành viên (chỉ Leader) */}
      <TargetAllocationPanel 
        members={allMembers} 
        monthlyTarget={teamTarget} 
        allocation={targetAllocation}
        setAllocation={setTargetAllocation}
        selectedMonth={selectedMonth}
      />

  {/* Tổng quan team (bao gồm cả Leader - Mỹ Anh) */}
      <TeamOverview 
        members={membersForOverview} 
        reports={reportsForOverview} 
        totalTarget={config.totalTarget}
        targetAllocation={targetAllocationAmounts}
      />

      {/* Form báo cáo (leader có thể nhập giúp, có option) */}
      <div id="leader-quick-form" className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-4"><ClipboardList/> Báo cáo nhanh</div>
        <ReportForm members={allMembers} options={options} onSubmit={addReport} />
      </div>
    </div>
  );
}

// ===== MEMBER LOGIN PAGE =====
function MemberLoginPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load members từ API (không có PIN)
    (async () => {
      try {
  const res = await apiFetch('/api/members');
        const data = await res.json();
        // Chỉ lấy members không phải leader
        const nonLeaders = Array.isArray(data) ? data.filter(m => m.role !== 'leader') : [];
        setMembers(nonLeaders);
        if (nonLeaders.length > 0) setSelectedMemberId(nonLeaders[0].id);
      } catch (e) {
        console.error('Failed to load members', e);
      }
    })();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!selectedMemberId || !pin) {
      setError('Vui lòng chọn tên và nhập mã PIN');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('Mã PIN phải gồm 4 chữ số');
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: Number(selectedMemberId), pin })
      });

      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        setError(data.message || 'Mã PIN không đúng');
        setLoading(false);
        return;
      }

      // Lưu session vào localStorage
      localStorage.setItem('memberSession', JSON.stringify({
        id: data.member.id,
        name: data.member.name,
        color: data.member.color,
        loginTime: new Date().toISOString()
      }));

      // Redirect to member page
      navigate(`/member/${data.member.id}`);
    } catch (e) {
      console.error('Login error', e);
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  const selectedMember = members.find(m => m.id === Number(selectedMemberId));

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Đăng nhập Member</h1>
          <p className="text-sm text-gray-600">Chọn tên của bạn và nhập mã PIN</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👤 Chọn thành viên
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                setError('');
              }}
              className="w-full p-3 border-2 border-gray-300 rounded-lg font-semibold text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔐 Mã PIN (4 chữ số)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPin(val);
                setError('');
              }}
              placeholder="••••"
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? 'Đang đăng nhập...' : '🔓 Đăng nhập'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 font-semibold mb-2">💡 Mã PIN mặc định:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Vũ: <code className="bg-white px-2 py-0.5 rounded">1111</code></li>
            <li>• Quỳnh: <code className="bg-white px-2 py-0.5 rounded">2222</code></li>
            <li>• Ngân: <code className="bg-white px-2 py-0.5 rounded">3333</code></li>
          </ul>
          <p className="text-xs text-blue-600 mt-2">Bạn có thể đổi PIN sau khi đăng nhập</p>
        </div>
      </div>
    </div>
  );
}

// ===== MEMBER PAGE =====
function MemberPage(){
  const navigate = useNavigate();
  const { id } = useParams(); // Lấy ID từ URL
  const [options] = useState(DEFAULT_OPTIONS);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [pinForm, setPinForm] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [pinError, setPinError] = useState('');
  
  // Modal cập nhật trạng thái đơn hàng
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  
  // Kiểm tra session
  const [currentMember, setCurrentMember] = useState(null);
  
  // Load members từ API thay vì dùng SEED_MEMBERS
  const [allMembers, setAllMembers] = useState([]);
  
  useEffect(() => {
    const sessionData = localStorage.getItem('memberSession');
    if (!sessionData) {
      navigate('/member/login');
      return;
    }
    
    try {
      const session = JSON.parse(sessionData);
      
      // Kiểm tra session.id có khớp với URL param không
     
      if (session.id !== Number(id)) {
        localStorage.removeItem('memberSession');
        navigate('/member/login');
        return;
      }
      
      setCurrentMember(session);
    } catch (e) {
      localStorage.removeItem('memberSession');
      navigate('/member/login');
    }
  }, [navigate, id]);

  useEffect(() => {
    // Load members from API
    (async () => {
      try {
  const res = await apiFetch('/api/members');
        const data = await res.json();
        setAllMembers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load members', e);
        setAllMembers(SEED_MEMBERS); // Fallback
      }
    })();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('memberSession');
    navigate('/member/login');
  };

  const handleChangePIN = async (e) => {
    e.preventDefault();
    setPinError('');

    // Validate
    if (pinForm.newPin.length !== 4 || !/^\d{4}$/.test(pinForm.newPin)) {
      setPinError('Mã PIN mới phải là 4 chữ số');
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinError('Mã PIN mới không khớp');
      return;
    }
    if (pinForm.oldPin === pinForm.newPin) {
      setPinError('Mã PIN mới phải khác mã PIN cũ');
      return;
    }

    try {
      const res = await apiFetch(`/api/members/${currentMember.id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin: pinForm.oldPin, newPin: pinForm.newPin })
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'Đổi mã PIN thất bại');
        return;
      }

      alert('✅ Đổi mã PIN thành công!');
      setShowChangePIN(false);
      setPinForm({ oldPin: '', newPin: '', confirmPin: '' });
    } catch (e) {
      console.error('Change PIN error:', e);
      setPinError('Lỗi kết nối server');
    }
  };

  const leader = allMembers.find(m=>m.role === "leader");
  const membersForMemberPage = allMembers.filter(m=>m.id !== leader?.id); // chỉ 3 người ngoài Leader

  // Config cố định cho member page
  const config = { totalTarget: 25_000_000_000, startDate: toISO("2025-10-14"), endDate: toISO("2026-01-19") };

  // Báo cáo load từ API cho member (chỉ xem + gửi)
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ start:'', end:'', phone:'', order:'desc' });
  
  const loadReports = async () => {
    try{
      setLoading(true);
  const res = await apiFetch('/api/reports');
      const data = await res.json();
      const normalized = Array.isArray(data) ? data.map(normalizeReport) : [];
      setReports(normalized);
    }catch(e){ 
      console.error(e); 
    }finally{
      setLoading(false);
    }
  };
  
  useEffect(()=>{
    loadReports();
  }, []);
  
  // CHỈ LẤY REPORTS CỦA MEMBER ĐANG LOGIN
  const myReports = useMemo(() => {
    if (!currentMember) return [];
    return reports.filter(r => r.memberId === currentMember.id);
  }, [reports, currentMember]);

  const filteredReports = useMemo(()=>{
    const phone = (filter.phone || '').trim().toLowerCase();
    const start = filter.start || '';
    const end = filter.end || '';
    let list = myReports.filter(r => {
      if (start && (r.date || '') < start) return false;
      if (end && (r.date || '') > end) return false;
      if (phone && !String(r.phone || '').toLowerCase().includes(phone)) return false;
      return true;
    });
    list.sort((a,b)=>{
      const ca = a.date || '';
      const cb = b.date || '';
      return filter.order === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
    });
    return list;
  }, [myReports, filter]);

  // Tính toán các chỉ số thực tế từ dữ liệu báo cáo CỦA MÌNH
  const realMetrics = useMemo(()=>{
    const totalRevenue = myReports.reduce((sum, r) => sum + (Number(r.sales) || 0), 0);
    const totalDeals = myReports.reduce((sum, r) => sum + (Number(r.closed) || 0), 0);
    const totalReplied = myReports.reduce((sum, r) => sum + (Number(r.replied) || 0), 0);
    const totalContacted = myReports.reduce((sum, r) => sum + (Number(r.contacted) || 0), 0);

    const aov = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    const replyRate = totalContacted > 0 ? totalReplied / totalContacted : 0;
    const convRate = totalReplied > 0 ? totalDeals / totalReplied : 0;

    return { aov, replyRate, convRate, totalRevenue, totalDeals, totalReplied, totalContacted };
  }, [myReports]);

  // KPI calc (sử dụng realMetrics)
  const kpi = useMemo(()=>{
    const teamCount = allMembers.length;
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const workdays = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) if (d.getDay() !== 0) workdays.push(new Date(d));
    const totalWorkdays = workdays.length || 1;
    const perMemberTarget = config.totalTarget / teamCount;
    const dailyPerMember = perMemberTarget / totalWorkdays;
    const weeklyPerMember = dailyPerMember * 6;
    
    // Sử dụng realMetrics
    const dealsPerDay = realMetrics.aov > 0 ? dailyPerMember / realMetrics.aov : 0;
    const requiredReplied = realMetrics.convRate > 0 ? dealsPerDay / realMetrics.convRate : 0;
    const requiredContacted = realMetrics.replyRate > 0 ? requiredReplied / realMetrics.replyRate : 0;
    
    return { perMemberTarget, dailyPerMember, weeklyPerMember, dealsPerDay, requiredReplied, requiredContacted };
  }, [config, allMembers.length, realMetrics]);

  const addReport = async (payload) => {
    try{
      const res = await apiFetch('/api/reports', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!res.ok) throw new Error('create failed');
      const created = await res.json();
      const normalized = normalizeReport(created);
      setReports(prev=> [normalized, ...prev]);
    }catch(e){
      console.error('member add report', e);
      alert('Không lưu được báo cáo');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport || !newStatus) return;
    
    try {
      // Gửi toàn bộ dữ liệu report, chỉ thay đổi status
      const updatedReport = { ...selectedReport, status: newStatus };
      
      const res = await apiFetch(`/api/reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedReport)
      });
      
      if (!res.ok) throw new Error('update failed');
      const updated = await res.json();
      const normalized = normalizeReport(updated);
      
      setReports(prev => prev.map(r => r.id === normalized.id ? normalized : r));
      setShowUpdateStatus(false);
      setSelectedReport(null);
      setNewStatus('');
      alert('✅ Cập nhật trạng thái thành công!');
    } catch (e) {
      console.error('Update status error:', e);
      alert('Không cập nhật được trạng thái');
    }
  };

  if (!currentMember) {
    return <div className="p-6 text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Header: Tên người dùng + Đổi PIN + Logout */}
      <div className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{backgroundColor: currentMember.color}}>
            {currentMember.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-gray-800">{currentMember.name}</div>
            <div className="text-xs text-gray-500">Thành viên</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChangePIN(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
          >
            <ShieldCheck size={16} />
            Đổi mã PIN
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Modal đổi mã PIN */}
      {showChangePIN && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck size={20} />
                Đổi mã PIN
              </h3>
              <button
                onClick={() => {
                  setShowChangePIN(false);
                  setPinForm({ oldPin: '', newPin: '', confirmPin: '' });
                  setPinError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePIN} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã PIN hiện tại
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="****"
                  value={pinForm.oldPin}
                  onChange={(e) => setPinForm(s => ({ ...s, oldPin: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã PIN mới (4 chữ số)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="****"
                  value={pinForm.newPin}
                  onChange={(e) => setPinForm(s => ({ ...s, newPin: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Xác nhận mã PIN mới
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="****"
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm(s => ({ ...s, confirmPin: e.target.value }))}
                />
              </div>

              {pinError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {pinError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePIN(false);
                    setPinForm({ oldPin: '', newPin: '', confirmPin: '' });
                    setPinError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal cập nhật trạng thái đơn hàng */}
      {showUpdateStatus && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Cập nhật trạng thái</h3>
              <button
                onClick={() => {
                  setShowUpdateStatus(false);
                  setSelectedReport(null);
                  setNewStatus('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Đơn hàng:</div>
              <div className="font-semibold">{selectedReport.orderCode || 'Chưa có mã'}</div>
              <div className="text-xs text-gray-500 mt-1">
                SĐT: {selectedReport.phone || '-'} | Ngày: {selectedReport.date}
              </div>
              <div className="text-xs text-gray-500">
                Doanh số: {fmtMoneyShort(selectedReport.sales || 0)}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái đơn hàng
              </label>
              <select
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="">-- Chọn trạng thái --</option>
                {options.statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowUpdateStatus(false);
                  setSelectedReport(null);
                  setNewStatus('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateStatus}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={!newStatus}
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI cards để member biết mục tiêu/ngày */}
      <KPIQuickCards
        totalTarget={config.totalTarget}
        perMemberTarget={kpi.perMemberTarget}
        dailyPerMember={kpi.dailyPerMember}
        weeklyPerMember={kpi.weeklyPerMember}
        requiredContacted={kpi.requiredContacted}
        requiredReplied={kpi.requiredReplied}
        dealsPerDay={kpi.dealsPerDay}
        reports={reports}
        config={config}
      />

      {/* Form báo cáo (giống leader) */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 font-bold text-gray-800 mb-4"><ClipboardList/> Báo cáo hằng ngày</div>
        <ReportForm members={membersForMemberPage} options={options} onSubmit={addReport} />
      </div>

      {/* Lịch sử báo cáo của member */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-bold text-gray-800"><FileText/> Lịch sử báo cáo gần đây</div>
          <button 
            onClick={loadReports}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-1 text-sm"
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
        {/* Bộ lọc */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-600">Từ ngày</label>
            <input type="date" className="w-full p-2 border rounded" value={filter.start} onChange={(e)=>setFilter(s=>({...s, start:e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Đến ngày</label>
            <input type="date" className="w-full p-2 border rounded" value={filter.end} onChange={(e)=>setFilter(s=>({...s, end:e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Tìm SĐT</label>
            <input className="w-full p-2 border rounded" placeholder="Nhập số điện thoại" value={filter.phone} onChange={(e)=>setFilter(s=>({...s, phone: e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Sắp xếp</label>
            <select className="w-full p-2 border rounded" value={filter.order} onChange={(e)=>setFilter(s=>({...s, order: e.target.value}))}>
              <option value="desc">Mới nhất trước</option>
              <option value="asc">Cũ nhất trước</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mb-2">
          <button className="text-sm px-3 py-1 bg-gray-100 rounded" onClick={()=>setFilter({ start:'', end:'', phone:'', order:'desc' })}>Xóa lọc</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Ngày</th>
                <th className="p-2">Mã đơn</th>
                <th className="p-2">Thành viên</th>
                <th className="p-2">Điện thoại</th>
                <th className="p-2 text-right">Tiếp cận</th>
                <th className="p-2 text-right">Phản hồi</th>
                <th className="p-2 text-right">Chốt</th>
                <th className="p-2 text-right">Doanh số</th>
                <th className="p-2">Trạng thái</th>
                <th className="p-2">Nền tảng</th>
                <th className="p-2">Sản phẩm</th>
                <th className="p-2">Xuất kho</th>
                <th className="p-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.slice(0,20).map((r)=>{
                  // Tìm member trong allMembers (bao gồm cả 4 người) để hiển thị tên
                  const mem = allMembers.find(m=>Number(m.id)===Number(r.memberId));
                  return (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{r.date}</td>
                      <td className="p-2 text-blue-600 font-mono text-xs">{r.orderCode || '-'}</td>
                      <td className="p-2 font-semibold">{mem?.name || `ID: ${r.memberId}`}</td>
                      <td className="p-2">{r.phone || '-'}</td>
                      <td className="p-2 text-right">{r.contacted || 0}</td>
                      <td className="p-2 text-right">{r.replied || 0}</td>
                      <td className="p-2 text-right">{r.closed || 0}</td>
                      <td className="p-2 text-right text-green-700 font-bold">{fmtMoneyShort(r.sales || 0)}</td>
                      <td className="p-2">{r.status || '-'}</td>
                      <td className="p-2">{r.platform || '-'}</td>
                      <td className="p-2">{r.product || '-'}</td>
                      <td className="p-2">{r.warehouse || '-'}</td>
                      <td className="p-2">
                        <button
                          onClick={() => {
                            setSelectedReport(r);
                            setNewStatus(r.status || '');
                            setShowUpdateStatus(true);
                          }}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Cập nhật
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="13" className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="text-gray-300" size={48} />
                      <p>Chưa có báo cáo nào</p>
                      <p className="text-xs">Hãy thêm báo cáo đầu tiên ở form bên trên</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredReports.length > 20 && (
          <div className="mt-3 text-center text-sm text-gray-500">
            Hiển thị 20/{filteredReports.length} báo cáo. Sử dụng bộ lọc để thu hẹp kết quả.
          </div>
        )}
      </div>
    </div>
  );
}
