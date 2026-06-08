import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mockUsers, mockPosts } from '../data/mockData';
import AppShell from '../components/AppShell';
import { useAuthStore } from '../store/authStore';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuthStore();
  const profile = mockUsers.find(u => u.id === Number(id)) || mockUsers[0];
  const isOwn = currentUser?.id === profile.id;
  const userPosts = mockPosts.filter(p => p.userId === profile.id);

  const strengthColor = {
    strong: { bg: '#dcfce7', text: '#166534', label: 'Strong connection' },
    medium: { bg: '#fef9c3', text: '#854d0e', label: 'Moderate connection' },
    weak: { bg: '#f3f4f6', text: '#6b7280', label: 'New connection' },
  }[profile.connectionStrength] || { bg: '#f3f4f6', text: '#6b7280', label: 'Connect' };

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Cover / Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}
        >
          {/* Cover band */}
          <div style={{
            height: 180,
            background: 'linear-gradient(135deg, #0f2040 0%, #1a3558 40%, #c9933a44 80%, #e8b86d33 100%)',
            position: 'relative',
          }}>
            {/* Subtle wave */}
            <svg style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} viewBox="0 0 1200 60" preserveAspectRatio="none" height="60" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,30 C200,0 400,60 600,30 C800,0 1000,60 1200,30 L1200,60 L0,60 Z" fill="rgba(255,255,255,0.04)" />
            </svg>
          </div>

          {/* Profile info */}
          <div style={{ background: '#fff', padding: '0 32px 28px', border: '1px solid #e8e0d0', borderTop: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginTop: -48, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  style={{
                    width: 100, height: 100, borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid #fff',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  }}
                />
                {!isOwn && (
                  <div style={{
                    position: 'absolute', bottom: 4, right: 4,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#22c55e',
                    border: '2px solid #fff',
                  }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 600, color: '#0f2040' }}>
                    {profile.name}
                  </h1>
                  <span style={{
                    padding: '4px 12px',
                    background: strengthColor.bg,
                    color: strengthColor.text,
                    borderRadius: 20,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 11, fontWeight: 600,
                  }}>{strengthColor.label}</span>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#4a5568', marginTop: 4 }}>
                  {profile.currentRole} @ {profile.company}
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#9ca3af', marginTop: 3 }}>
                  📍 {profile.location} · 🎓 {profile.university} '{String(profile.gradYear).slice(2)} · {profile.mutualConnections} mutual connections
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', paddingBottom: 4 }}>
                {isOwn ? (
                  <button style={{
                    padding: '9px 20px',
                    background: '#0f2040',
                    color: '#fdf6e3',
                    border: 'none', borderRadius: 7,
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer',
                  }}>Edit Profile</button>
                ) : (
                  <>
                    <button style={{
                      padding: '9px 20px',
                      background: 'linear-gradient(135deg, #c9933a, #e8b86d)',
                      color: '#0f2040',
                      border: 'none', borderRadius: 7,
                      fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                      cursor: 'pointer',
                    }}>Connect</button>
                    <button style={{
                      padding: '9px 20px',
                      background: 'transparent',
                      color: '#0f2040',
                      border: '1px solid #0f2040', borderRadius: 7,
                      fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
                      cursor: 'pointer',
                    }}>Message</button>
                  </>
                )}
              </div>
            </div>

            {/* Bio */}
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#374151', lineHeight: 1.7, fontWeight: 300, maxWidth: 680, marginBottom: 20 }}>
              {profile.bio}
            </p>

            {/* Meta chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                `🏠 From ${profile.hometown}`,
                `🏭 ${profile.industry}`,
                `📚 ${profile.major}`,
              ].map(chip => (
                <span key={chip} style={{
                  padding: '5px 14px',
                  background: '#f3f4f6',
                  borderRadius: 20,
                  fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#4a5568',
                }}>{chip}</span>
              ))}
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          {/* Activity */}
          <div>
            {/* Skills */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '24px', marginBottom: 20, border: '1px solid #e8e0d0' }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, marginBottom: 16, color: '#0f2040' }}>Skills & Expertise</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.skills.map(skill => (
                  <div key={skill} style={{
                    padding: '8px 16px',
                    background: 'rgba(15,32,64,0.05)',
                    border: '1px solid rgba(15,32,64,0.12)',
                    borderRadius: 8,
                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: '#0f2040',
                  }}>{skill}</div>
                ))}
              </div>
            </div>

            {/* Posts */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #e8e0d0' }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, marginBottom: 16, color: '#0f2040' }}>Activity</h2>
              {userPosts.length === 0 ? (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#9ca3af' }}>No posts yet.</p>
              ) : userPosts.map(post => (
                <div key={post.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#374151', lineHeight: 1.6, fontWeight: 300, marginBottom: 8 }}>
                    {post.content.slice(0, 200)}{post.content.length > 200 ? '...' : ''}
                  </p>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9ca3af' }}>
                    {new Date(post.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {Object.values(post.reactions).reduce((a, b) => a + b, 0)} reactions
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div>
            {/* Interests */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 16, border: '1px solid #e8e0d0' }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, marginBottom: 14, color: '#0f2040' }}>Interests</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {profile.interests.map(i => (
                  <span key={i} style={{
                    padding: '5px 12px',
                    background: 'rgba(201,147,58,0.08)',
                    border: '1px solid rgba(201,147,58,0.2)',
                    borderRadius: 20,
                    fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#c9933a',
                  }}>{i}</span>
                ))}
              </div>
            </div>

            {/* Connections preview */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #e8e0d0' }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, marginBottom: 14, color: '#0f2040' }}>
                Connections <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 14, color: '#9ca3af' }}>({profile.connections.length})</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {profile.connections.slice(0, 6).map(cid => {
                  const c = mockUsers.find(u => u.id === cid);
                  if (!c) return null;
                  return (
                    <div key={cid} style={{ textAlign: 'center' }}>
                      <img src={c.avatar} alt={c.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', marginBottom: 4 }} />
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#374151', fontWeight: 500 }}>
                        {c.name.split(' ')[0]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
