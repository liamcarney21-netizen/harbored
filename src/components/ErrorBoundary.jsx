import { Component } from 'react'

// One malformed record used to unmount the whole app and leave a blank screen
// forever. This catches render errors, says so, and offers a reload.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', background: '#0a1628', color: '#F5F4EF',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '26px', fontWeight: 500, lineHeight: 1.2 }}>
          Something went wrong
        </div>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#8C9AAD', maxWidth: '360px', margin: '12px 0 22px' }}>
          Harbored hit an error it couldn't recover from. Your data is safe on the server. Reloading usually clears it.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '13px 26px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: '#D3A95C', color: '#0a1628', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          Reload Harbored
        </button>
      </div>
    )
  }
}
