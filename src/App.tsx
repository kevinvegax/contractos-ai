import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Workspace = { id: string; name: string; slug: string; role: 'admin' | 'project_manager' | 'member' }
type Project = { id: string; name: string; description?: string; objectives?: string; start_date?: string | null; due_date?: string | null; requirements?: string; status: 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'; created_at?: string }
type Activity = { action: string; entity_type: string; created_at: string }
type WorkspacePayload = { workspace: Workspace; projects: Project[]; activity: Activity[] }
type User = { id: string; email: string; full_name: string }
type Invitation = { id: string; email: string; expires_at: string }
type TeamMember = { id: string; email: string; full_name: string; role: string; status: 'active' | 'inactive' }

async function getWorkspace(): Promise<WorkspacePayload> {
  const workspacesResponse = await fetch('/api/workspaces')
  if (!workspacesResponse.ok) throw new Error('Unable to load workspaces')
  const { workspaces } = await workspacesResponse.json() as { workspaces: Workspace[] }
  const first = workspaces[0]
  if (!first) throw new Error('No company workspace is available for this account')
  const response = await fetch(`/api/workspace?company_id=${first.id}`)
  if (!response.ok) throw new Error('Unable to load workspace')
  return await response.json() as WorkspacePayload
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
  const [workspaceError, setWorkspaceError] = useState('')
  const [active, setActive] = useState('Overview')
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteMessage, setInviteMessage] = useState('')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectMessage, setProjectMessage] = useState('')
  const [projectBusy, setProjectBusy] = useState(false)

  useEffect(() => {
    void getSession().catch(() => null).then((sessionUser) => {
      setUser(sessionUser)
      setAuthChecked(true)
      if (sessionUser) void getWorkspace().then(setData).catch((error: unknown) => setWorkspaceError(error instanceof Error ? error.message : 'Unable to load workspace'))
    })
  }, [])

  useEffect(() => {
    if (data?.workspace.id) {
      void fetch(`/api/invitations?company_id=${data.workspace.id}`).then(async (response) => {
        if (response.ok) setInvitations((await response.json() as { invitations: Invitation[] }).invitations)
      })
    }
  }, [data?.workspace.id])

  useEffect(() => {
    if (data?.workspace.id) void fetch(`/api/team?company_id=${data.workspace.id}`).then(async (response) => { if (response.ok) setTeam((await response.json() as { users: TeamMember[] }).users) })
  }, [data?.workspace.id])
  if (window.location.pathname === '/accept-invitation') return <AcceptInvitation />
  if (!authChecked) return <div className="auth-loading"><span className="brand-mark">N</span><span>Loading your secure workspace…</span></div>
  if (!user) return <SignIn onSignedIn={(sessionUser) => { setUser(sessionUser); setWorkspaceError(''); void getWorkspace().then(setData).catch((error: unknown) => setWorkspaceError(error instanceof Error ? error.message : 'Unable to load workspace')) }} />
  if (!data) return <div className="auth-loading"><span className="brand-mark">N</span><span>{workspaceError || 'Loading your workspace…'}</span></div>
  const workspace = data.workspace
  const initials = workspace.name.split(' ').map((word) => word[0]).slice(0, 2).join('')
  const projects = data.projects
  const activity = data.activity
  const canCreateProject = workspace.role === 'admin' || workspace.role === 'project_manager'

  async function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setInviteMessage('')
    const response = await fetch(`/api/invitations?company_id=${workspace.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
    const payload = await response.json() as { invitation?: Invitation; acceptance_url?: string; error?: string }
    if (!response.ok || !payload.invitation) { setInviteMessage(payload.error ?? 'Unable to create invitation.'); return }
    setInvitations((current) => [payload.invitation!, ...current]); setInviteEmail(''); setInviteMessage(`Invitation sent to ${payload.invitation.email}.`)
  }

  async function revokeInvite(id: string) {
    const response = await fetch(`/api/invitations?company_id=${workspace.id}&id=${id}`, { method: 'DELETE' })
    if (response.ok) setInvitations((current) => current.filter((invite) => invite.id !== id))
  }

  async function setMemberStatus(member: TeamMember) {
    const status = member.status === 'active' ? 'inactive' : 'active'
    const response = await fetch(`/api/team?company_id=${workspace.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_id: member.id, status }) })
    if (response.ok) setTeam((current) => current.map((item) => item.id === member.id ? { ...item, status } : item))
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setProjectMessage(''); setProjectBusy(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`/api/projects?company_id=${workspace.id}${editingProject ? `&id=${editingProject.id}` : ''}`, { method: editingProject ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), description: form.get('description'), objectives: form.get('objectives'), start_date: form.get('start_date'), due_date: form.get('due_date'), requirements: form.get('requirements'), status: form.get('status') }) })
      const payload = await response.json() as { project?: Project; error?: string }
      if (!response.ok || !payload.project) { setProjectMessage(payload.error ?? 'Unable to create project.'); return }
      setData((current) => current ? { ...current, projects: editingProject ? current.projects.map((project) => project.id === payload.project!.id ? payload.project! : project) : [payload.project!, ...current.projects] } : current)
      setEditingProject(null); setShowProjectForm(false)
    } catch { setProjectMessage('The project service is unavailable. Please try again.') } finally { setProjectBusy(false) }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">N</span><span>Northstar</span></div>
      <button className="workspace-switcher" onClick={() => setShowSwitcher(!showSwitcher)}><span className="workspace-avatar">NC</span><span className="workspace-name"><strong>{workspace.name}</strong><small>Company workspace</small></span><span className="chevron">⌄</span></button>
      {showSwitcher && <div className="switcher-popover"><strong>{workspace.name}</strong><span>Personalized workspace</span><button onClick={() => setShowSwitcher(false)}>Workspace settings</button></div>}
      <nav className="nav-list" aria-label="Main navigation"><p className="nav-label">Workspace</p>{([['Overview', 'grid'], ['Projects', 'folder'], ['Evidence', 'file'], ['Team', 'users']] as const).map(([label, icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => setActive(label)}><Icon name={icon} />{label}{label === 'Evidence' && <span className="nav-count">12</span>}</button>)}<p className="nav-label nav-label-lower">Manage</p><button className={`nav-item ${active === 'Settings' ? 'active' : ''}`} onClick={() => setActive('Settings')}><Icon name="settings" />Settings</button></nav>
      <div className="sidebar-bottom"><div className="secure-note"><Icon name="shield" /><div><strong>Your data is private</strong><span>Only your company can access it.</span></div></div><button className="user-row" onClick={() => { void fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.reload()) }}><span className="user-avatar">{initials}</span><div><strong>{user.full_name}</strong><span>Administrator · Sign out</span></div><span className="more">•••</span></button></div>
    </aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{active}</strong></div><div className="top-actions"><span className="status-dot" /> All systems operational <button className="help">?</button><span className="top-avatar">{initials}</span></div></header>
      <div className="page-wrap"><section className="welcome"><div><p className="kicker">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p><h1>Good morning, Maya<span className="wave">✦</span></h1><p className="subhead">Here’s what’s happening across your company workspace.</p></div>{canCreateProject && <button className="primary-action" onClick={() => { setEditingProject(null); setProjectMessage(''); setShowProjectForm(true) }}><Icon name="plus" /> New project</button>}</section>
        {showProjectForm && <div className="modal-backdrop"><section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><div className="modal-heading"><div><p className="kicker">Project setup</p><h2 id="new-project-title">{editingProject ? 'Edit project' : 'Create a project'}</h2><p>{editingProject ? 'Keep the project details accurate for your team.' : 'Define the work your company workspace needs to track.'}</p></div><button className="modal-close" type="button" aria-label="Close" onClick={() => { setEditingProject(null); setShowProjectForm(false) }}>×</button></div><form key={editingProject?.id ?? 'new'} onSubmit={(event) => void createProject(event)}><label>Project name<input name="name" placeholder="e.g. Riverside renovation" defaultValue={editingProject?.name ?? ''} required minLength={2} autoFocus /></label><label>Description<textarea name="description" placeholder="What is this project about?" defaultValue={editingProject?.description ?? ''} rows={3} /></label><div className="form-two-column"><label>Start date<input type="date" name="start_date" defaultValue={editingProject?.start_date ?? ''} /></label><label>Due date<input type="date" name="due_date" defaultValue={editingProject?.due_date ?? ''} /></label></div><label>Objectives<textarea name="objectives" placeholder="List the outcomes you want to achieve" defaultValue={editingProject?.objectives ?? ''} rows={3} /></label><label>Requirements<textarea name="requirements" placeholder="List key requirements, one per line" defaultValue={editingProject?.requirements ?? ''} rows={3} /></label><label>Status<select name="status" defaultValue={editingProject?.status ?? 'active'}><option value="draft">Draft</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>{projectMessage && <div className="signin-error" role="alert">{projectMessage}</div>}<div className="modal-actions"><button className="secondary-action" type="button" onClick={() => { setEditingProject(null); setShowProjectForm(false) }}>Cancel</button><button className="primary-action" type="submit" disabled={projectBusy}>{projectBusy ? 'Saving…' : editingProject ? 'Save changes' : 'Create project'}<Icon name="arrow" /></button></div></form></section></div>}
        {workspace.role === 'admin' && <section className="invite-panel"><div><p className="kicker">Team access</p><h2>Invite people to your workspace</h2><p>Invite teammates by email. Each link is private, single-use, and expires in 7 days.</p></div><form onSubmit={(event) => void inviteUser(event)}><input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required /><button className="primary-action" type="submit"><Icon name="plus" /> Send invite</button></form>{inviteMessage && <p className="invite-message" role="status">{inviteMessage}</p>}{invitations.length > 0 && <div className="pending-invites"><strong>Pending invitations</strong>{invitations.map((invite) => <div key={invite.id}><span>{invite.email}</span><small>Expires {new Date(invite.expires_at).toLocaleDateString()}</small><button type="button" onClick={() => void revokeInvite(invite.id)}>Revoke</button></div>)}</div>}</section>}
        {workspace.role === 'admin' && <section className="team-panel"><div className="team-heading"><div><p className="kicker">Workspace access</p><h2>Company users</h2><p>Deactivate access without deleting project or task history.</p></div><span>{team.length} members</span></div>{team.map((member) => <div className="team-member" key={member.id}><span className="user-avatar">{member.full_name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span><div><strong>{member.full_name}</strong><small>{member.email} · {member.role}</small></div><span className={`member-status ${member.status}`}>{member.status}</span><button type="button" onClick={() => void setMemberStatus(member)}>{member.status === 'active' ? 'Deactivate' : 'Reactivate'}</button></div>)}</section>}
        <div className="section-title"><div><p className="kicker">Your workspace</p><h2>At a glance</h2></div><button className="text-action">View activity <Icon name="arrow" /></button></div>
        <section className="stats-grid"><div className="stat-card"><span className="stat-icon blue"><Icon name="folder" /></span><div><span>Active projects</span><strong>{projects.filter((project) => project.status === 'active').length}</strong></div><small className="positive">+2 this month</small></div><div className="stat-card"><span className="stat-icon purple"><Icon name="file" /></span><div><span>Evidence files</span><strong>12</strong></div><small>Across all projects</small></div><div className="stat-card"><span className="stat-icon amber"><Icon name="users" /></span><div><span>Team members</span><strong>8</strong></div><small>2 pending invites</small></div></section>
        <div className="content-grid"><section className="card"><div className="card-heading"><div><h3>Recent projects</h3><p>Projects in your company workspace</p></div>{canCreateProject && <button className="icon-button" aria-label="Add project" onClick={() => { setEditingProject(null); setProjectMessage(''); setShowProjectForm(true) }}><Icon name="plus" /></button>}</div><div className="project-list">{projects.map((project) => <div className="project-row" key={project.id}><span className="project-mark">{project.name.slice(0, 1)}</span><div><strong>{project.name}</strong><span>{project.created_at ? `Created ${new Date(project.created_at).toLocaleDateString()}` : 'Created today'}</span></div><span className={`pill ${project.status}`}><i /> {project.status === 'on_hold' ? 'On Hold' : project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>{canCreateProject && project.status !== 'archived' && <button className="edit-project" type="button" onClick={() => { setEditingProject(project); setProjectMessage(''); setShowProjectForm(true) }}>Edit</button>}{canCreateProject && project.status === 'archived' && workspace.role === 'admin' && <button className="edit-project" type="button" onClick={() => { setEditingProject(project); setProjectMessage(''); setShowProjectForm(true) }}>Restore</button>}<Icon name="arrow" /></div>)}</div><button className="card-footer">View all projects <Icon name="arrow" /></button></section><section className="card"><div className="card-heading"><div><h3>Recent activity</h3><p>Latest changes in your workspace</p></div></div><div className="activity-list">{activity.map((item, index) => <div className="activity-row" key={`${item.action}-${index}`}><span className={`activity-dot dot-${index}`} /><div><strong>{item.action}</strong><span>{item.entity_type === 'workspace' ? workspace.name : 'Workspace security'} <b>·</b> {item.created_at}</span></div></div>)}</div><button className="card-footer">View full activity <Icon name="arrow" /></button></section></div>
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

function AcceptInvitation() {
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [name, setName] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false)
  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    const response = await fetch('/api/invitations/accept', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, full_name: name, password }) })
    const payload = await response.json() as { error?: string }
    if (!response.ok) { setError(payload.error ?? 'Unable to accept invitation.'); return }
    setDone(true); window.setTimeout(() => { window.location.href = '/' }, 700)
  }
  return <main className="signin-shell"><section className="signin-card"><div className="signin-brand"><span className="brand-mark">N</span><span>Northstar</span></div>{done ? <div className="signin-heading"><p className="kicker">You’re in</p><h1>Invitation accepted</h1><p>Your company workspace is ready. Taking you there now…</p></div> : <><div className="signin-heading"><p className="kicker">Workspace invitation</p><h1>Join your team</h1><p>Create your secure account to access the company workspace.</p></div><form onSubmit={(event) => void accept(event)}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Create password<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /><small className="password-hint">Use at least 8 characters.</small></label>{error && <div className="signin-error" role="alert">{error}</div>}<button className="signin-button" type="submit">Accept invitation <Icon name="arrow" /></button></form></>}</section></main>
}

export default App
