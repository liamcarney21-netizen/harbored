import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockPosts, mockUsers, mockEvents, suggestedConnections } from '../data/mockData';
import { useAuthStore } from '../store/authStore';
import AppShell from '../components/AppShell';

const EMOJI_OPTIONS = ['🎉', '❤️', '🔥', '🙌', '🧠', '〽️'];

function PostCard({ post }) {
  const author = mockUsers.find(u => u.id === post.userId);
  const [reactions, setReactions] = useState(post.reactions);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuthStore();

  const react = (emoji) => {
    setReactions(r => ({ ...r, [emoji]: (r[emoji] || 0) + 1 }));
  };

  const addComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments(c => [...c, { userId: user?.id || 1, text: newComment, timestamp: new Date().toISOString() }]);
    setNewComment('');
  };

  const typeColors = {
    milestone: { bg: 'rgba(201,147,58,0.08)', border: 'rgba(201,147,58,0.25)', label: '🏆 Milestone', color: '#c9933a' },
    job: { bg: 'rgba(15,100,200,0.06)', border: 'rgba(15,100,200,0.2)', label: '💼 Career Update', color: '#1a6bc4' },
    update: { bg: 'rgba(15,32,64,0.04)', border: 'rgba(15,32,64,0.1)', label: '📣 Update', color: '#0f2040' },
    event: { bg: 'rgba(80,160,80,0.06)', border: 'rgba(80,160,80,0.2)', label: '🎉 Event', color: '#2d7a2d' },
  };
  const tc = typeColors[post.type] || typeColors.update;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: '#fff',
        border: `1px solid ${tc.border}`,
        borderRadius: 12,
        padding: '24px',
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={author?.avatar} alt={author?.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, color: '#0f2040' }}>{author?.name}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              {author?.currentRole} @ {author?.company} · {author?.gradYear}
            </div>
          </div>
        </div>
        <div style={{
          padding: '4px 10px',
          background: tc.bg,
          border: `1px solid ${tc.border}`,
          borderRadius: 20,
          fontFamily: 'Inter, sans-serif',
          fontSize: 11, fontWeight: 600,
          color: tc.color,
          whiteSpace: 'nowrap',
        }}>{tc.label}</div>
      </div>

      {/* Content */}
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: 1.65, color: '#374151', marginBottom: 16, fontWeight: 300 }}>
        {post.content}
      </p>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {post.tags.map(tag => (
            <span key={tag} style={{
              padding: '3px 10px',
              background: '#f3f4f6',
              borderRadius: 12,
              fontFamily: 'Inter, sans-serif',
              fontSize: 11, color: '#6b7280',
            }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Reactions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
        {Object.entries(reactions).map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            style={{
              padding: '5px 10px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 20,
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex', gap: 5, alignItems: 'center',
              color: '#374151',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
          >
            {emoji} <span style={{ fontWeight: 600, fontSize: 12 }}>{count}</span>
          </button>
        ))}
        {/* Add reaction */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => react(EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)])}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: '1px dashed #e5e7eb',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: 13, color: '#9ca3af',
            }}
          >+ React</button>
        </div>
      </div>

      {/* Comments toggle */}
      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={() => setShowComments(s => !s)}
          style={{
            background: 'none', border: 'none',
            fontFamily: 'Inter, sans-serif', fontSize: 13,
            color: '#6b7280', cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {showComments ? 'Hide' : `${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              {comments.map((c, i) => {
                const cUser = mockUsers.find(u => u.id === c.userId);
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <img src={cUser?.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ background: '#f3f4f6', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', flex: 1 }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12, color: '#0f2040', marginBottom: 3 }}>{cUser?.name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{c.text}</div>
                    </div>
                  </div>
                );
              })}
              {/* Comment input */}
              <form onSubmit={addComment} style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <img src={mockUsers[0].avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  style={{
                    flex: 1, padding: '9px 14px',
                    background: '#f3f4f6',
                    border: '1px solid transparent',
                    borderRadius: 20,
                    fontFamily: 'Inter, sans-serif', fontSize: 13,
                    color: '#374151', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#c9933a'}
                  onBlur={e => e.target.style.borderColor = 'transparent'}
                />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Feed() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('all');
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState(mockPosts);

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter);

  const handlePost = (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosts(prev => [{
      id: Date.now(),
      userId: 1,
      type: 'update',
      content: newPost,
      timestamp: new Date().toISOString(),
      reactions: {},
      comments: [],
      tags: [],
    }, ...prev]);
    setNewPost('');
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

        {/* Main feed column */}
        <div>
          {/* Catch-up nudge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, rgba(201,147,58,0.1), rgba(201,147,58,0.05))',
              border: '1px solid rgba(201,147,58,0.25)',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>⚓</span>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#0f2040' }}>
                  You haven't connected with James Okafor in 65 days
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  He just hit his 1-year work anniversary at Stripe.
                </div>
              </div>
            </div>
            <button style={{
              padding: '7px 16px',
              background: '#c9933a',
              color: '#fff',
              border: 'none', borderRadius: 6,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600, fontSize: 12,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Say congrats 🎉</button>
          </motion.div>

          {/* New post box */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 20, border: '1px solid #e8e0d0' }}>
            <form onSubmit={handlePost}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <img src={user?.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                <textarea
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  placeholder="Share an update with your network..."
                  rows={3}
                  style={{
                    flex: 1, padding: '12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8, resize: 'none',
                    fontFamily: 'Inter, sans-serif', fontSize: 14,
                    color: '#374151', outline: 'none',
                    lineHeight: 1.5,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#c9933a'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{
                  padding: '9px 24px',
                  background: 'linear-gradient(135deg, #0f2040, #1a3558)',
                  color: '#fdf6e3',
                  border: 'none', borderRadius: 6,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}>Post</button>
              </div>
            </form>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { value: 'all', label: 'All Updates' },
              { value: 'milestone', label: '🏆 Milestones' },
              { value: 'job', label: '💼 Career' },
              { value: 'event', label: '🎉 Events' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  padding: '7px 16px',
                  background: filter === value ? '#0f2040' : '#fff',
                  color: filter === value ? '#fdf6e3' : '#6b7280',
                  border: `1px solid ${filter === value ? '#0f2040' : '#e5e7eb'}`,
                  borderRadius: 20,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13, fontWeight: filter === value ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >{label}</button>
            ))}
          </div>

          {/* Posts */}
          {filtered.map(post => <PostCard key={post.id} post={post} />)}
        </div>

        {/* Right sidebar */}
        <div>
          {/* Upcoming events */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 20, border: '1px solid #e8e0d0' }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#0f2040' }}>
              Upcoming Events
            </h3>
            {mockEvents.slice(0, 2).map(event => (
              <div key={event.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#0f2040', marginBottom: 4 }}>
                  {event.title}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>
                  📅 {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {event.location.split(',')[0]}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{
                    padding: '5px 14px',
                    background: '#0f2040',
                    color: '#fdf6e3',
                    border: 'none', borderRadius: 5,
                    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer',
                  }}>RSVP</button>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                    {event.rsvps.length} going
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Suggested connections */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #e8e0d0' }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#0f2040' }}>
              People You May Know
            </h3>
            {suggestedConnections.map(person => (
              <div key={person.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                <img src={person.avatar} alt={person.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#0f2040' }}>{person.name}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{person.reason}</div>
                  <button style={{
                    padding: '4px 12px',
                    background: 'transparent',
                    border: '1px solid #0f2040',
                    borderRadius: 5,
                    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                    color: '#0f2040', cursor: 'pointer',
                  }}>Connect</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
