import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [name, setName] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get('/api/users')
      setUsers(response.data?.rows ?? [])
    } catch (loadError) {
      console.error(loadError)
      setError('Failed to load users. Check the server connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a name first.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await axios.post('/api/users', { name: trimmedName })
      setName('')
      await loadUsers()
    } catch (saveError) {
      console.error(saveError)
      setError('Failed to save the name. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Oracle XE + Node.js + React</p>
        <h1>Save a user name</h1>
        <p className="sub">
          Type a name, send it to the server, and see it stored in your Oracle
          database.
        </p>
      </header>

      <section className="card">
        <form className="form" onSubmit={handleSubmit}>
          <label className="label" htmlFor="name">
            User name
          </label>
          <div className="field">
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Amara Perera"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Saved users</h2>
          <button type="button" className="ghost" onClick={loadUsers}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="muted">No users yet. Add the first one above.</p>
        ) : (
          <ul className="list">
            {users.map((user) => (
              <li key={user.ID}>
                <div className="list-main">{user.NAME}</div>
                <div className="list-meta">
                  #{user.ID}{' '}
                  {user.CREATED_AT
                    ? `• ${new Date(user.CREATED_AT).toLocaleString()}`
                    : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
