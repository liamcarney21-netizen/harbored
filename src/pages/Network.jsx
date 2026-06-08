import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mockUsers, suggestedConnections } from '../data/mockData';
import AppShell from '../components/AppShell';
import { useAuthStore } from '../store/authStore';

const INDUSTRIES = ['All', 'Finance', 'Technology', 'Consulting', 'Healthcare', 'Government', 'Research & Academia'];
const LOCATIONS = ['All', 'New York, NY', 'San Francisco, CA', 'Chicago, IL', 'Ann Arbor, MI', 'Austin, TX', 'Detroit, MI'];

function ConnectionCard({ person, connected, onConnect, onClick }) {
  const strengthColors = {
    strong: '#22c55e',
    medium: '#f59e0b',
    weak: '#94a3b8',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px',
        border: '1px solid #e8e0d0',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,32,64,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={person.avatar} alt={person.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
          {person.connectionStrength && (
            <div style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 12, height: 12, borderRadius: '50%',
              background: strengthColors[person.connectionStrength] || '#94a3b8',
              border: '2px solid #fff',
            }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#0f2040' }}>{person.name}</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {person.currentRole} @ {person.company}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            🎓 {person.university} '{String(person.gradYear).slice(2)} · 📍 {person.location?.split(',')[0]}
          </div>
        </div>
      </div>

      {person.reason && (
        <div style={{
          padding: '6px 10px',
          background: 'rgba(201,147,58,0.08)',
          borderRadius: 6,
          fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#c9933a',
          marginBottom: 12,
        }}>{person.reason}</div>
      )}

      {person.mutualConnections > 0 && (
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>
          {person.mutualConnections} mutual connection{person.mutualConnections !== 1 ? 's' : ''}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); onConnect(person.id); }}
          style={{
            padding: '7px 16px',
            background: connected ? '#f3f4f6' : '#0f2040',
            color: connected ? '#6b7280' : '#fdf6e3',
            border: 'none', borderRadius: 6,
            fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12,
            cursor: 'pointer',
            flex: 1,
            transition: 'all 0.2s',
          }}
        >
          {connected ? '✓ Connected' : 'Connect'}
        </button>
        <button
          onClick={e => e.stopPropagation()}
          style={{
            padding: '7px 14px',
            background: 'transparent',
            color: '#0f2040',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12,
            cursor: 'pointer',
          }}
        >Message</button>
      </div>
    </motion.div>
  );
}

export default function Network() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [location, setLocation] = useState('All');
  const [connected, setConnected] = useState(new Set(user?.connections || []));
  const [activeTab, setActiveTab] = useState('discover');

  const toggleConnect = (id) => {
    setConnected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const others = mockUsers.filter(u => u.id !== user?.id);
  const filtered = others.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.company.toLowerCase().includes(search.toLowerCase()) || u.currentRole.toLowerCase().includes(search.toLowerCase());
    const matchIndustry = industry === 'All' || u.industry === industry;
    const matchLocation = location === 'All' || u.location.includes(location.split(',')[0]);
    return matchSearch && matchIndustry && matchLocation;
  });

  const myConnections = others.filter(u => connected.has(u.id));

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 600, color: '#0f2040', marginBottom: 6 }}>
            Your Network
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#6b7280', fontWeight: 300 }}>
            {myConnections.length} connections · {others.length} Michigan alumni found
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
          {[
            { id: 'discover', label: 'Discover' },
            { id: 'connections', label: `My Connections (${myConnections.length})` },
            { id: 'suggestions', label: 'Suggested' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #c9933a' : '2px solid transparent',
                fontFamily: 'Inter, sans-serif',
                fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? '#c9933a' : '#6b7280',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'all 0.2s',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Search & filters */}
        {activeTab !== 'suggestions' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role, or company..."
              style={{
                flex: 1, minWidth: 240,
                padding: '10px 16px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif', fontSize: 14,
                color: '#374151', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#c9933a'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              style={{
                padding: '10px 14px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif', fontSize: 13,
                color: '#374151', outline: 'none', cursor: 'pointer',
              }}
            >
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              style={{
                padding: '10px 14px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif', fontSize: 13,
                color: '#374151', outline: 'none', cursor: 'pointer',
              }}
            >
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        )}

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {activeTab === 'discover' && filtered.map(person => (
            <ConnectionCard
              key={person.id}
              person={person}
              connected={connected.has(person.id)}
              onConnect={toggleConnect}
              onClick={() => navigate(`/profile/${person.id}`)}
            />
          ))}
          {activeTab === 'connections' && myConnections.map(person => (
            <ConnectionCard
              key={person.id}
              person={person}
              connected={true}
              onConnect={toggleConnect}
              onClick={() => navigate(`/profile/${person.id}`)}
            />
          ))}
          {activeTab === 'suggestions' && [...suggestedConnections].map(person => (
            <ConnectionCard
              key={person.id}
              person={person}
              connected={connected.has(person.id)}
              onConnect={toggleConnect}
              onClick={() => {}}
            />
          ))}
        </div>

        {activeTab === 'connections' && myConnections.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: '#0f2040', marginBottom: 8 }}>No connections yet</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 300 }}>
              Head to Discover to start building your network.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
