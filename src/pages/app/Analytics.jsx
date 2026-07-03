import { motion } from 'framer-motion'
import { TrendingUp, MessageSquare, BarChart2, Heart, Zap } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import Avatar from '../../components/Avatar'
import { alertsOverTime, messagesByType, activeContacts } from '../../data/appData'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }
const stagger = { animate: { transition: { staggerChildren: 0.07 } } }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #D5DADF', color: '#1D2226', fontSize: '12px' }}>
      <div style={{ color: '#5E6774' }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: '2px', color: '#0A66C2' }}>
        {payload[0].value} {payload[0].name}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, suffix }) {
  return (
    <motion.div
      variants={fadeUp}
      style={{
        borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
        background: '#FFFFFF', border: '1px solid #E4E6E9',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: '#5E6774', fontFamily: 'Inter, sans-serif' }}>
          {title}
        </span>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,102,194,0.1)' }}>
          <Icon style={{ width: '14px', height: '14px', color: '#0A66C2' }} />
        </div>
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '30px', fontWeight: 700, color: '#1D2226', lineHeight: 1 }}>
        {value}{suffix && <span style={{ fontSize: '28px', color: '#5E6774', marginLeft: '2px' }}>{suffix}</span>}
      </div>
    </motion.div>
  )
}

export default function Analytics() {
  const stats = [
    { title: 'Total Alerts Detected',      value: '47', icon: Zap },
    { title: 'Messages Sent via Harbored', value: '31', icon: MessageSquare },
    { title: 'Response Rate',              value: '78', icon: TrendingUp, suffix: '%' },
    { title: 'Relationships Strengthened', value: '18', icon: Heart },
  ]

  return (
    <motion.div
      style={{ minHeight: '100%', padding: '40px', fontFamily: 'Inter, sans-serif' }}
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Header */}
      <motion.div variants={fadeUp} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: '#1D2226', marginBottom: '4px' }}>
          Analytics
        </h1>
        <p style={{ fontSize: '13px', color: '#5E6774' }}>How Harbored is keeping you connected</p>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
        {stats.map(s => <StatCard key={s.title} {...s} />)}
      </motion.div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Area chart */}
        <motion.div
          variants={fadeUp}
          style={{ borderRadius: '12px', padding: '20px', background: '#FFFFFF', border: '1px solid #E8EAED' }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1D2226' }}>Alerts Detected</h3>
            <p style={{ fontSize: '12px', marginTop: '2px', color: '#5E6774' }}>Last 30 days</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={alertsOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0A66C2" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0A66C2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" />
              <XAxis dataKey="day" tick={{ fill: '#5E6774', fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fill: '#5E6774', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="alerts" name="alerts" stroke="#0A66C2" strokeWidth={2} fill="url(#alertGradient)" dot={false} activeDot={{ r: 4, fill: '#0A66C2', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bar chart */}
        <motion.div
          variants={fadeUp}
          style={{ borderRadius: '12px', padding: '20px', background: '#FFFFFF', border: '1px solid #E8EAED' }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1D2226' }}>Messages by Event Type</h3>
            <p style={{ fontSize: '12px', marginTop: '2px', color: '#5E6774' }}>All time</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={messagesByType} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" vertical={false} />
              <XAxis dataKey="type" tick={{ fill: '#5E6774', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#5E6774', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="messages" fill="#0A66C2" radius={[4, 4, 0, 0]} maxBarSize={40} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Most active contacts */}
      <motion.div
        variants={fadeUp}
        style={{ borderRadius: '12px', padding: '20px', background: '#FFFFFF', border: '1px solid #E8EAED' }}
      >
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1D2226', marginBottom: '16px' }}>Most Active Contacts</h3>
        <div>
          {activeContacts.map((c, i) => (
            <div
              key={c.name}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0',
                borderBottom: i < activeContacts.length - 1 ? '1px solid #EEEFF1' : 'none',
              }}
            >
              <span style={{ fontSize: '12px', width: '16px', textAlign: 'center', fontWeight: 500, color: '#5E6774' }}>{i + 1}</span>
              <Avatar initials={c.initials} color={c.color} size="sm" />
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#1D2226' }}>{c.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', width: '80px', background: '#E4E6E9' }}>
                  <div style={{ width: `${(c.interactions / 8) * 100}%`, height: '100%', borderRadius: '3px', background: '#0A66C2' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, width: '90px', textAlign: 'right', color: '#0A66C2' }}>
                  {c.interactions} interactions
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
