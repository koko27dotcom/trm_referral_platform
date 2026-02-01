import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, Users, Briefcase, Wallet, TrendingUp, AlertCircle,
  CheckCircle2, XCircle, Clock, Search, Filter, Download,
  MoreVertical, ChevronDown, ChevronRight, BarChart3,
  PieChart, Activity, Globe, DollarSign, Settings,
  Bell, LogOut, Lock, Eye, Edit2, Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ReferralPayout {
  id: string
  referrerName: string
  referrerEmail: string
  jobTitle: string
  company: string
  amount: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  requestedAt: string
  processedAt?: string
}

interface Company {
  id: string
  name: string
  email: string
  plan: string
  jobCount: number
  totalSpend: number
  status: 'active' | 'suspended' | 'pending'
  joinedAt: string
}

interface User {
  id: string
  name: string
  email: string
  type: 'jobseeker' | 'recruiter' | 'referrer'
  referrals: number
  earnings: number
  status: 'active' | 'suspended'
  joinedAt: string
}

interface PlatformStats {
  totalUsers: number
  totalCompanies: number
  totalJobs: number
  totalReferrals: number
  totalPayouts: number
  revenue: number
  pendingPayouts: number
}

const mockPayouts: ReferralPayout[] = [
  { id: '1', referrerName: 'Aung Kyaw', referrerEmail: 'aung@email.com', jobTitle: 'Senior Developer', company: 'TechCorp', amount: 150000, status: 'pending', requestedAt: '2024-01-20' },
  { id: '2', referrerName: 'Su Su', referrerEmail: 'su@email.com', jobTitle: 'Product Manager', company: 'InnovateTech', amount: 200000, status: 'approved', requestedAt: '2024-01-19', processedAt: '2024-01-20' },
  { id: '3', referrerName: 'Min Thu', referrerEmail: 'min@email.com', jobTitle: 'UX Designer', company: 'DesignHub', amount: 120000, status: 'paid', requestedAt: '2024-01-15', processedAt: '2024-01-18' },
  { id: '4', referrerName: 'Khin Lay', referrerEmail: 'khin@email.com', jobTitle: 'Marketing Lead', company: 'GrowthCo', amount: 180000, status: 'pending', requestedAt: '2024-01-21' },
  { id: '5', referrerName: 'Zaw Lin', referrerEmail: 'zaw@email.com', jobTitle: 'DevOps Engineer', company: 'CloudTech', amount: 250000, status: 'rejected', requestedAt: '2024-01-18', processedAt: '2024-01-19' }
]

const mockCompanies: Company[] = [
  { id: '1', name: 'TechCorp Myanmar', email: 'hr@techcorp.mm', plan: 'Growth', jobCount: 12, totalSpend: 3500000, status: 'active', joinedAt: '2023-08-15' },
  { id: '2', name: 'InnovateTech', email: 'jobs@innovate.mm', plan: 'Enterprise', jobCount: 25, totalSpend: 8500000, status: 'active', joinedAt: '2023-09-20' },
  { id: '3', name: 'DesignHub', email: 'hello@designhub.mm', plan: 'Starter', jobCount: 3, totalSpend: 450000, status: 'active', joinedAt: '2023-11-05' },
  { id: '4', name: 'GrowthCo', email: 'careers@growthco.mm', plan: 'Growth', jobCount: 8, totalSpend: 2100000, status: 'suspended', joinedAt: '2023-10-12' }
]

const mockUsers: User[] = [
  { id: '1', name: 'Aung Kyaw', email: 'aung@email.com', type: 'referrer', referrals: 15, earnings: 1250000, status: 'active', joinedAt: '2023-08-01' },
  { id: '2', name: 'Su Su', email: 'su@email.com', type: 'referrer', referrals: 12, earnings: 980000, status: 'active', joinedAt: '2023-08-15' },
  { id: '3', name: 'Min Thu', email: 'min@email.com', type: 'jobseeker', referrals: 0, earnings: 0, status: 'active', joinedAt: '2023-09-01' },
  { id: '4', name: 'Khin Lay', email: 'khin@email.com', type: 'recruiter', referrals: 3, earnings: 150000, status: 'active', joinedAt: '2023-09-20' }
]

const platformStats: PlatformStats = {
  totalUsers: 15420,
  totalCompanies: 156,
  totalJobs: 892,
  totalReferrals: 3240,
  totalPayouts: 48500000,
  revenue: 12500000,
  pendingPayouts: 8
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'companies' | 'users' | 'settings'>('overview')
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleBulkAction = (action: 'approve' | 'reject' | 'pay') => {
    console.log(`Bulk ${action} for:`, selectedPayouts)
    setSelectedPayouts([])
  }

  const filteredPayouts = mockPayouts.filter(p => {
    const matchesSearch = p.referrerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Admin Portal</h1>
                <p className="text-xs text-slate-400">TRM Referral Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold">
                  AD
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'payouts', label: 'Payouts', icon: Wallet, badge: platformStats.pendingPayouts },
              { id: 'companies', label: 'Companies', icon: Briefcase },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                  activeTab === tab.id 
                    ? 'text-blue-600' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {tab.badge}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AdminStatCard 
                  icon={Users} 
                  label="Total Users" 
                  value={platformStats.totalUsers.toLocaleString()}
                  trend="+12%"
                  trendUp={true}
                  color="blue"
                />
                <AdminStatCard 
                  icon={Briefcase} 
                  label="Companies" 
                  value={platformStats.totalCompanies.toLocaleString()}
                  trend="+5%"
                  trendUp={true}
                  color="purple"
                />
                <AdminStatCard 
                  icon={Activity} 
                  label="Active Jobs" 
                  value={platformStats.totalJobs.toLocaleString()}
                  trend="+8%"
                  trendUp={true}
                  color="green"
                />
                <AdminStatCard 
                  icon={Wallet} 
                  label="Total Payouts" 
                  value={`${(platformStats.totalPayouts / 1000000).toFixed(1)}M MMK`}
                  trend="+23%"
                  trendUp={true}
                  color="amber"
                />
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Revenue Overview</h3>
                    <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
                      <option>Last 30 days</option>
                      <option>Last 90 days</option>
                      <option>This year</option>
                    </select>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {[45, 62, 38, 75, 55, 85, 70, 90, 65, 80, 95, 88].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-500"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-slate-400">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referral Performance */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Referral Performance</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Conversion Rate</span>
                        <span className="font-bold text-slate-900">38%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '38%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Avg. Time to Hire</span>
                        <span className="font-bold text-slate-900">22 days</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '65%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Referrer Satisfaction</span>
                        <span className="font-bold text-slate-900">4.8/5</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '96%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                </div>
                <div className="divide-y divide-slate-200">
                  {[
                    { action: 'New company registered', detail: 'TechCorp Myanmar joined Growth plan', time: '5 min ago', type: 'success' },
                    { action: 'Payout processed', detail: 'Su Su - 200,000 MMK for Product Manager', time: '15 min ago', type: 'info' },
                    { action: 'High value referral', detail: 'Senior Developer position - 300K bonus', time: '1 hour ago', type: 'warning' },
                    { action: 'Job posted', detail: 'InnovateTech posted 3 new positions', time: '2 hours ago', type: 'success' }
                  ].map((activity, i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'success' ? 'bg-green-100 text-green-600' :
                        activity.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {activity.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                         activity.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                         <Activity className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{activity.action}</p>
                        <p className="text-sm text-slate-500">{activity.detail}</p>
                      </div>
                      <span className="text-sm text-slate-400">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'payouts' && (
            <motion.div
              key="payouts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search by referrer or job..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  {selectedPayouts.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">{selectedPayouts.length} selected</span>
                      <button 
                        onClick={() => handleBulkAction('approve')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleBulkAction('pay')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Mark Paid
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Payouts Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input 
                          type="checkbox" 
                          checked={selectedPayouts.length === filteredPayouts.length}
                          onChange={(e) => setSelectedPayouts(e.target.checked ? filteredPayouts.map(p => p.id) : [])}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Referrer</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Job / Company</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPayouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedPayouts.includes(payout.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPayouts([...selectedPayouts, payout.id])
                              } else {
                                setSelectedPayouts(selectedPayouts.filter(id => id !== payout.id))
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                              {payout.referrerName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{payout.referrerName}</p>
                              <p className="text-sm text-slate-500">{payout.referrerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{payout.jobTitle}</p>
                          <p className="text-sm text-slate-500">{payout.company}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900">{payout.amount.toLocaleString()} MMK</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            payout.status === 'paid' ? 'bg-green-100 text-green-700' :
                            payout.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            payout.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {payout.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                            {payout.status === 'pending' && <Clock className="w-3 h-3" />}
                            {payout.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {payout.requestedAt}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {payout.status === 'pending' && (
                              <>
                                <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {payout.status === 'approved' && (
                              <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                Mark Paid
                              </button>
                            )}
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'companies' && (
            <motion.div
              key="companies"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Company</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Plan</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Jobs</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Total Spend</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Joined</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mockCompanies.map((company) => (
                      <tr key={company.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                              {company.name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{company.name}</p>
                              <p className="text-sm text-slate-500">{company.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            company.plan === 'Enterprise' ? 'bg-purple-100 text-purple-700' :
                            company.plan === 'Growth' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {company.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{company.jobCount}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{company.totalSpend.toLocaleString()} MMK</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            company.status === 'active' ? 'bg-green-100 text-green-700' :
                            company.status === 'suspended' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              company.status === 'active' ? 'bg-green-500' :
                              company.status === 'suspended' ? 'bg-red-500' :
                              'bg-amber-500'
                            }`} />
                            {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{company.joinedAt}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">User</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Referrals</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Earnings</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Joined</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mockUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.name}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.type === 'referrer' ? 'bg-green-100 text-green-700' :
                            user.type === 'recruiter' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{user.referrals}</td>
                        <td className="px-6 py-4 font-medium text-green-600">{user.earnings.toLocaleString()} MMK</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.joinedAt}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Lock className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Platform Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Platform Name</label>
                    <input type="text" defaultValue="TRM Referral Platform" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Default Currency</label>
                    <select className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                      <option value="MMK">Myanmar Kyat (MMK)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="THB">Thai Baht (THB)</option>
                      <option value="SGD">Singapore Dollar (SGD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Referral Bonus Range</label>
                    <div className="flex items-center gap-4">
                      <input type="number" defaultValue={50000} className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                      <span className="text-slate-500">to</span>
                      <input type="number" defaultValue={500000} className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Notification Settings</h3>
                <div className="space-y-4">
                  {[
                    { label: 'New company registration', desc: 'Get notified when a new company signs up' },
                    { label: 'Payout requests', desc: 'Get notified for new payout requests' },
                    { label: 'High value referrals', desc: 'Get notified for referrals over 200K MMK' },
                    { label: 'System alerts', desc: 'Get notified for system errors and warnings' }
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-slate-900">{setting.label}</p>
                        <p className="text-sm text-slate-500">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function AdminStatCard({ icon: Icon, label, value, trend, trendUp, color }: {
  icon: any
  label: string
  value: string
  trend: string
  trendUp: boolean
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600'
  }

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-slate-200 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </motion.div>
  )
}
