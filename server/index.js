const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const oracledb = require('oracledb')

dotenv.config({ path: '.env.local' })

const {
  DB_USER,
  DB_PASSWORD,
  DB_CONNECT_STRING,
  PORT = 5000,
} = process.env

if (!DB_USER || !DB_PASSWORD || !DB_CONNECT_STRING) {
  console.error('Missing DB config. Check server/.env')
  process.exit(1)
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/users', async (req, res) => {
  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT id, name, created_at
       FROM users
       ORDER BY id DESC`,
    )
    res.json({ rows: result.rows })
  } catch (error) {
    console.error('GET /api/users failed', error)
    res.status(500).json({ error: 'Database error' })
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (closeError) {
        console.error('Failed to close connection', closeError)
      }
    }
  }
})

app.post('/api/users', async (req, res) => {
  const rawName = typeof req.body?.name === 'string' ? req.body.name : ''
  const name = rawName.trim()

  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    await connection.execute(
      `INSERT INTO users (name)
       VALUES (:name)`,
      { name },
      { autoCommit: true },
    )
    res.status(201).json({ message: 'User saved' })
  } catch (error) {
    console.error('POST /api/users failed', error)
    res.status(500).json({ error: 'Database error' })
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (closeError) {
        console.error('Failed to close connection', closeError)
      }
    }
  }
})

async function start() {
  try {
    await oracledb.createPool({
      user: DB_USER,
      password: DB_PASSWORD,
      connectString: DB_CONNECT_STRING,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
    })

    app.listen(Number(PORT), () => {
      console.log(`Server listening on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server', error)
    process.exit(1)
  }
}

start()

process.on('SIGINT', async () => {
  try {
    const pool = oracledb.getPool()
    await pool.close(10)
  } catch (error) {
    console.error('Error closing Oracle pool', error)
  } finally {
    process.exit(0)
  }
})
