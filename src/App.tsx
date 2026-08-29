import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Workspace = { id: string; name: string; slug: string; role: 'admin' | 'member' }
type Project = { id: string; name: string; status: string }
type Activity = { action: string; entity_type: string; created_at: string }
type WorkspacePayload = { workspace: Workspace; projects: Project[]; activity: Activity[] }
type User = { id: string; email: string; full_name: string }

const demoWorkspace: WorkspacePayload = {
  workspace: { id: 'demo', name: 'Northstar Construction', slug: 'northstar-construction', role: 'admin' },
  projects: [{ id: '1', name: 'Riverside renovation', status: 'active' }, { id: '2', name: 'Oak street commercial', status: 'active' }],
  activity: [{ action: 'Workspace created', entity_type: 'workspace', created_at: 'Just now' }, { action: 'Access policy enabled', entity_type: 'security', created_at: 'Just now' }],
}

async function getWorkspace(): Promise<WorkspacePayload> {
  try {
    const workspacesResponse = await fetch('/api/workspaces')
    if (!workspacesResponse.ok) throw new Error('API unavailable')
    const { workspaces } = await workspacesResponse.json() as { workspaces: Workspace[] }
    const first = workspaces[0]
    if (!first) return demoWorkspace
    const response = await fetch(`/api/workspace?company_id=${first.id}`)
    if (!response.ok) throw new Error('Workspace unavailable')
    return await response.json() as WorkspacePayload
  } catch { return demoWorkspace }
}

async function getSession(): Promise<User | null> {
  const response = await fetch('/api/auth/session')
  if (!response.ok) return null
  const payload = await response.json() as { user: User }
  return payload.user
}

function Icon({ name }: { name: 'grid' | 'folder' | 'file' | 'users' | 'settings' | 'shield' | 'plus' | 'arrow' }) {
  const paths = {
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', folder: 'M3 6.5h7l1.6 2H21v9.5H3z', file: 'M6 3h8l4 4v14H6zM14 3v5h5',
    users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3 3 0 1 0 0-6', settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 13.5l1.3 1-.2 1.8-1.7 1-1.5-.6-1.1.7-.2 1.6-1.7.7-1.3-1.1-1.3.1-1 1.3-1.8-.4-.5-1.7.9-1.1-.3-1.3-1.4-.7.2-1.8 1.6-.4.7-1.2-.4-1.5 1.3-1.3 1.6.6 1.1-.8.2-1.6 1.7-.7 1.3 1.1 1.3-.1 1-1.3 1.8.4.5 1.7-.9 1.1.3 1.3 1.4.7-.2 1.8-.1.4-1.6 1.2.4 1.5Z',
    shield: 'M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6zM8.5 12l2.2 2.2 4.8-5', plus: 'M12 5v14M5 12h14', arrow: 'M5 12h13M13 7l5 5-5 5',
  } as const
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [data, setData] = useState<WorkspacePayload | null>(null)
  const [active, setActive] = useState('Overview')
  const [showSwitcher, setShowSwitcher] = useState(false)
  useEffect(() => {
    void getSession().catch(() => null).then((sessionUser) => {
      setUser(sessionUser)
      setAuthChecked(true)
      if (sessionUser) void getWorkspace().then(setData)
    })
  }, [])
  const workspace = data?.workspace ?? demoWorkspace.workspace
  const initials = useMemo(() => workspace.name.split(' ').map((word) => word[0]).slice(0, 2).join(''), [workspace.name])
  if (!authChecked) return <div className="auth-loading"><span className="brand-mark">N</span><span>Loading your secure workspace…</span></div>
  if (!user) return <SignIn onSignedIn={(sessionUser) => { setUser(sessionUser); void getWorkspace().then(setData) }} />
  const projects = data?.projects ?? demoWorkspace.projects
  const activity = data?.activity ?? demoWorkspace.activity

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">N</span><span>Northstar</span></div>
      <button className="workspace-switcher" onClick={() => setShowSwitcher(!showSwitcher)}><span className="workspace-avatar">NC</span><span className="workspace-name"><strong>{workspace.name}</strong><small>Company workspace</small></span><span className="chevron">⌄</span></button>
      {showSwitcher && <div className="switcher-popover"><strong>{workspace.name}</strong><span>Personalized workspace</span><button onClick={() => setShowSwitcher(false)}>Workspace settings</button></div>}
      <nav className="nav-list" aria-label="Main navigation"><p className="nav-label">Workspace</p>{([['Overview', 'grid'], ['Projects', 'folder'], ['Evidence', 'file'], ['Team', 'users']] as const).map(([label, icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => setActive(label)}><Icon name={icon} />{label}{label === 'Evidence' && <span className="nav-count">12</span>}</button>)}<p className="nav-label nav-label-lower">Manage</p><button className={`nav-item ${active === 'Settings' ? 'active' : ''}`} onClick={() => setActive('Settings')}><Icon name="settings" />Settings</button></nav>
      <div className="sidebar-bottom"><div className="secure-note"><Icon name="shield" /><div><strong>Your data is private</strong><span>Only your company can access it.</span></div></div><button className="user-row" onClick={() => { void fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.reload()) }}><span className="user-avatar">{initials}</span><div><strong>{user.full_name}</strong><span>Administrator · Sign out</span></div><span className="more">•••</span></button></div>
    </aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{active}</strong></div><div className="top-actions"><span className="status-dot" /> All systems operational <button className="help">?</button><span className="top-avatar">{initials}</span></div></header>
      <div className="page-wrap"><section className="welcome"><div><p className="kicker">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p><h1>Good morning, Maya<span className="wave">✦</span></h1><p className="subhead">Here’s what’s happening across your company workspace.</p></div><button className="primary-action"><Icon name="plus" /> New project</button></section>
        <section className="security-banner"><div className="security-icon"><Icon name="shield" /></div><div><strong>Company workspace secured</strong><p>Your organization has a private, isolated workspace. Projects, evidence, and team activity are only visible to members of <b>{workspace.name}</b>.</p></div><span className="verified">✓ Verified</span></section>
        <div className="section-title"><div><p className="kicker">Your workspace</p><h2>At a glance</h2></div><button className="text-action">View activity <Icon name="arrow" /></button></div>
        <section className="stats-grid"><div className="stat-card"><span className="stat-icon blue"><Icon name="folder" /></span><div><span>Active projects</span><strong>{projects.length}</strong></div><small className="positive">+2 this month</small></div><div className="stat-card"><span className="stat-icon purple"><Icon name="file" /></span><div><span>Evidence files</span><strong>12</strong></div><small>Across all projects</small></div><div className="stat-card"><span className="stat-icon amber"><Icon name="users" /></span><div><span>Team members</span><strong>8</strong></div><small>2 pending invites</small></div></section>
        <div className="content-grid"><section className="card"><div className="card-heading"><div><h3>Recent projects</h3><p>Projects in your company workspace</p></div><button className="icon-button" aria-label="Add project"><Icon name="plus" /></button></div><div className="project-list">{projects.map((project) => <div className="project-row" key={project.id}><span className="project-mark">{project.name.slice(0, 1)}</span><div><strong>{project.name}</strong><span>Updated today</span></div><span className="pill"><i /> Active</span><Icon name="arrow" /></div>)}</div><button className="card-footer">View all projects <Icon name="arrow" /></button></section><section className="card"><div className="card-heading"><div><h3>Recent activity</h3><p>Latest changes in your workspace</p></div></div><div className="activity-list">{activity.map((item, index) => <div className="activity-row" key={`${item.action}-${index}`}><span className={`activity-dot dot-${index}`} /><div><strong>{item.action}</strong><span>{item.entity_type === 'workspace' ? workspace.name : 'Workspace security'} <b>·</b> {item.created_at}</span></div></div>)}</div><button className="card-footer">View full activity <Icon name="arrow" /></button></section></div>
        <footer className="page-footer"><span>Northstar workspace</span><span><span className="tiny-dot" /> Data isolated by company</span><span>© 2024 Northstar</span></footer>
      </div></main>
  </div>
}

function SignIn({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState('admin@northstar.build')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const response = await fetch('/api/auth/signin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const payload = await response.json() as { user?: User; error?: string }
      if (!response.ok || !payload.user) { setError(payload.error ?? 'Unable to sign in.'); return }
      onSignedIn(payload.user)
    } catch { setError('The sign-in service is unavailable. Please try again.') } finally { setBusy(false) }
  }
  return <main className="signin-shell"><section className="signin-card"><div className="signin-brand"><span className="brand-mark">N</span><span>Northstar</span></div><div className="signin-heading"><p className="kicker">Secure access</p><h1>Welcome back</h1><p>Sign in to access your company workspace and evidence.</p></div><form onSubmit={(event) => void submit(event)}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <div className="signin-error" role="alert">{error}</div>}<button className="signin-button" type="submit" disabled={busy}>{busy ? 'Signing you in…' : 'Sign in'}<Icon name="arrow" /></button></form><div className="signin-security"><Icon name="shield" /><span>Protected with encrypted sessions<br />Your password is never stored in plain text.</span></div></section></main>
}

export default App
