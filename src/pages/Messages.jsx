import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockMessages, mockUsers } from '../data/mockData';
import AppShell from '../components/AppShell';
import { useAuthStore } from '../store/authStore';

export default function Messages() {
  const { user } = useAuthStore();
  const [threads, setThreads] = useState(mockMessages);
  const [activeThread, setActiveThread] = useState(mockMessages[0]);
  const [input, setInput] = useState('');

  const getOtherUser = (thread) => {
    if (thread.isGroup) return null;
    const otherId = thread.participants.find(id => id !== user?.id);
    return mockUsers.find(u => u.id === otherId);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = { from: user?.id || 1, text: input, time: 'Just now', read: true };
    const updated = {
      ...activeThread,
      messages: [...activeThread.messages, msg],
      lastMessage: input,
      lastTime: 'Just now',
      unread: 0,
    };
    setThreads(t => t.map(th => th.id === activeThread.id ? updated : th));
    setActiveThread(updated);
    setInput('');
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', height: 'calc(100vh - 96px)', background: '#fff', borderRadius: 16, border: '1px solid #e8e0d0', overflow: 'hidden' }}>

        {/* Thread list */}
        <div style={{ width: 320, borderRight: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#0f2040', marginBottom: 12 }}>Messages</h2>
            <input
              placeholder="Search conversations..."
              style={{
                width: '100%', padding: '8px 12px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif', fontSize: 13,
                color: '#374151', outline: 'none',
              }}
            />
          </div>

          {/* Threads */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {threads.map(thread => {
              const other = getOtherUser(thread);
              const isActive = activeThread?.id === thread.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => setActiveThread(thread)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex', gap: 12, alignItems: 'center',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(15,32,64,0.05)' : 'transparent',
                    borderLeft: isActive ? '3px solid #c9933a' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Avatar */}
                  {thread.isGroup ? (
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0f2040, #c9933a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0,
                    }}>〽️</div>
                  ) : (
                    <img src={other?.avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: thread.unread ? 700 : 500, fontSize: 13, color: '#0f2040' }}>
                        {thread.isGroup ? thread.groupName : other?.name}
                      </span>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9ca3af' }}>{thread.lastTime}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                      <span style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 12,
                        color: thread.unread ? '#0f2040' : '#9ca3af',
                        fontWeight: thread.unread ? 500 : 300,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 180,
                      }}>
                        {thread.lastMessage}
                      </span>
                      {thread.unread > 0 && (
                        <span style={{
                          width: 18, height: 18,
                          background: '#c9933a',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
                          color: '#fff', flexShrink: 0,
                        }}>{thread.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* New message */}
          <div style={{ padding: '16px', borderTop: '1px solid #f3f4f6' }}>
            <button style={{
              width: '100%', padding: '10px',
              background: '#0f2040',
              color: '#fdf6e3',
              border: 'none', borderRadius: 8,
              fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
            }}>+ New Message</button>
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeThread ? (
            <>
              {/* Chat header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {activeThread.isGroup ? (
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0f2040, #c9933a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>〽️</div>
                ) : (
                  <img src={getOtherUser(activeThread)?.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                )}
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#0f2040' }}>
                    {activeThread.isGroup ? activeThread.groupName : getOtherUser(activeThread)?.name}
                  </div>
                  {!activeThread.isGroup && (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#9ca3af' }}>
                      {getOtherUser(activeThread)?.currentRole} @ {getOtherUser(activeThread)?.company}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeThread.messages.map((msg, i) => {
                  const isMe = msg.from === (user?.id || 1);
                  const sender = mockUsers.find(u => u.id === msg.from);
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                      {!isMe && <img src={sender?.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginBottom: 2 }} />}
                      <div style={{ maxWidth: '68%' }}>
                        <div
                          className={isMe ? 'bubble-sent' : 'bubble-received'}
                          style={{ padding: '10px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', lineHeight: 1.5, fontWeight: 300 }}
                        >
                          {msg.text}
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                          {msg.time} {isMe && (msg.read ? '✓✓' : '✓')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6' }}>
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                      flex: 1, padding: '11px 16px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 24,
                      fontFamily: 'Inter, sans-serif', fontSize: 14,
                      color: '#374151', outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#c9933a'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <button type="submit" style={{
                    padding: '11px 20px',
                    background: '#0f2040',
                    color: '#fdf6e3',
                    border: 'none', borderRadius: 24,
                    fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer',
                  }}>Send →</button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#9ca3af' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: '#0f2040' }}>Select a conversation</div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
