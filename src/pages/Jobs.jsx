import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockJobs, mockUsers } from '../data/mockData';
import AppShell from '../components/AppShell';

const INDUSTRIES = ['All', 'Finance', 'Fintech', 'Technology', 'Consulting', 'Healthcare', 'Government / Public Policy', 'Automotive / Clean Energy', 'Research & Academia'];
const TYPES = ['All', 'Full-time', 'Internship'];

function JobCard({ job, onClick, active }) {
  const poster = mockUsers.find(u => u.id === job.postedBy);
  const alumni = job.alumniAtCompany.map(id => mockUsers.find(u => u.id === id)).filter(Boolean);

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 10,
        padding: '18px 20px',
        border: `1px solid ${active ? '#c9933a' : '#e8e0d0'}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: active ? '0 0 0 2px rgba(201,147,58,0.2)' : 'none',
        marginBottom: 10,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#c9c2b0'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#e8e0d0'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#0f2040', marginBottom: 3 }}>{job.role}</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4a5568', fontWeight: 500 }}>{job.company}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            padding: '3px 9px',
            background: job.type === 'Internship' ? 'rgba(201,147,58,0.1)' : 'rgba(15,32,64,0.07)',
            border: `1px solid ${job.type === 'Internship' ? 'rgba(201,147,58,0.3)' : 'rgba(15,32,64,0.15)'}`,
            borderRadius: 12,
            fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
            color: job.type === 'Internship' ? '#c9933a' : '#0f2040',
          }}>{job.type}</span>
        </div>
      </div>

      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
        📍 {job.location} · 💰 {job.salary} · 🏭 {job.industry}
      </div>

      {job.canRefer && alumni.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex' }}>
            {alumni.slice(0, 3).map((a, i) => (
              <img key={a.id} src={a.avatar} alt="" style={{
                width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
                border: '2px solid #fff', marginLeft: i > 0 ? -8 : 0,
              }} />
            ))}
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
            Alumni can refer ✓
          </span>
        </div>
      )}
    </div>
  );
}

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [type, setType] = useState('All');
  const [activeJob, setActiveJob] = useState(mockJobs[0]);
  const [referralSent, setReferralSent] = useState(new Set());

  const filtered = mockJobs.filter(j => {
    const matchSearch = !search || j.role.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchIndustry = industry === 'All' || j.industry === industry;
    const matchType = type === 'All' || j.type === type;
    return matchSearch && matchIndustry && matchType;
  });

  const poster = mockUsers.find(u => u.id === activeJob?.postedBy);
  const alumni = activeJob?.alumniAtCompany.map(id => mockUsers.find(u => u.id === id)).filter(Boolean) || [];

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 600, color: '#0f2040', marginBottom: 6 }}>
            Job Board
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#6b7280', fontWeight: 300 }}>
            Opportunities where Michigan alumni can open doors for you.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search roles, companies..."
            style={{
              flex: 1, minWidth: 200,
              padding: '10px 16px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontFamily: 'Inter, sans-serif', fontSize: 14,
              color: '#374151', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#c9933a'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <select value={industry} onChange={e => setIndustry(e.target.value)} style={{
            padding: '10px 14px', background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: 8,
            fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151',
            outline: 'none', cursor: 'pointer',
          }}>
            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)} style={{
            padding: '10px 14px', background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: 8,
            fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151',
            outline: 'none', cursor: 'pointer',
          }}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          {/* Job list */}
          <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 4 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
              {filtered.length} opening{filtered.length !== 1 ? 's' : ''} found
            </div>
            {filtered.map(job => (
              <JobCard
                key={job.id}
                job={job}
                active={activeJob?.id === job.id}
                onClick={() => setActiveJob(job)}
              />
            ))}
          </div>

          {/* Job detail */}
          {activeJob && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeJob.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '32px',
                  border: '1px solid #e8e0d0',
                  maxHeight: 'calc(100vh - 220px)',
                  overflowY: 'auto',
                }}
              >
                {/* Header */}
                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 600, color: '#0f2040', marginBottom: 4 }}>
                        {activeJob.role}
                      </h2>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, color: '#4a5568' }}>
                        {activeJob.company}
                      </div>
                    </div>
                    <span style={{
                      padding: '6px 14px',
                      background: activeJob.type === 'Internship' ? 'rgba(201,147,58,0.1)' : 'rgba(15,32,64,0.07)',
                      border: `1px solid ${activeJob.type === 'Internship' ? 'rgba(201,147,58,0.3)' : 'rgba(15,32,64,0.15)'}`,
                      borderRadius: 20,
                      fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
                      color: activeJob.type === 'Internship' ? '#c9933a' : '#0f2040',
                    }}>{activeJob.type}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 12 }}>
                    {[
                      { icon: '📍', text: activeJob.location },
                      { icon: '💰', text: activeJob.salary },
                      { icon: '🏭', text: activeJob.industry },
                      { icon: '📅', text: `Posted ${new Date(activeJob.posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` },
                    ].map(({ icon, text }) => (
                      <span key={text} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#6b7280' }}>
                        {icon} {text}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Alumni referral banner */}
                {activeJob.canRefer && alumni.length > 0 && (
                  <div style={{
                    padding: '16px 20px',
                    background: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: 10,
                    marginBottom: 24,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ display: 'flex' }}>
                        {alumni.map((a, i) => (
                          <img key={a.id} src={a.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', marginLeft: i > 0 ? -10 : 0 }} />
                        ))}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#166534' }}>
                          Michigan alumni work here
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#22c55e' }}>
                          {activeJob.referralNote}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setReferralSent(s => new Set([...s, activeJob.id]))}
                      style={{
                        padding: '8px 18px',
                        background: referralSent.has(activeJob.id) ? '#f3f4f6' : '#22c55e',
                        color: referralSent.has(activeJob.id) ? '#6b7280' : '#fff',
                        border: 'none', borderRadius: 6,
                        fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {referralSent.has(activeJob.id) ? '✓ Referral Requested' : '🤝 Request a Referral'}
                    </button>
                  </div>
                )}

                {/* Description */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: '#0f2040', marginBottom: 12 }}>About the Role</h3>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#374151', lineHeight: 1.7, fontWeight: 300 }}>
                    {activeJob.description}
                  </p>
                </div>

                {/* Requirements */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, color: '#0f2040', marginBottom: 12 }}>Requirements</h3>
                  <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                    {activeJob.requirements.map(req => (
                      <li key={req} style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#374151',
                        fontWeight: 300, lineHeight: 1.6,
                        padding: '6px 0',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex', gap: 10, alignItems: 'center',
                      }}>
                        <span style={{ color: '#c9933a', fontWeight: 700, fontSize: 16 }}>·</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button style={{
                    padding: '12px 28px',
                    background: 'linear-gradient(135deg, #0f2040, #1a3558)',
                    color: '#fdf6e3',
                    border: 'none', borderRadius: 8,
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                    cursor: 'pointer',
                  }}>Apply Now</button>
                  <button style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    color: '#0f2040',
                    border: '1px solid #0f2040', borderRadius: 8,
                    fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14,
                    cursor: 'pointer',
                  }}>Save Job</button>
                </div>

                {/* Posted by */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <img src={poster?.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#9ca3af' }}>
                    Posted by <strong style={{ color: '#4a5568' }}>{poster?.name}</strong> ({poster?.university} '{String(poster?.gradYear).slice(2)})
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppShell>
  );
}
