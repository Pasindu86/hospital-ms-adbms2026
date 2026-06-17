const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const oracledb = require('oracledb')
const path = require('path')
const authRoutes = require('./routes/auth')
const nurseRoutes = require('./routes/nurse')
const adminRoutes = require('./routes/admin')
const doctorRoutes = require('./routes/doctor')
const pharmacistRoutes = require('./routes/pharmacist')
const patientRoutes = require('./routes/patients')
const patientPortalRoutes = require('./routes/patient.routes')

dotenv.config({ path: '.env.local' })


const {
  DB_USER,
  DB_PASSWORD,
  DB_CONNECT_STRING,
  WALLET_DIR,
  WALLET_PASSWORD,
  PORT = 5000,
} = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, WALLET_DIR)
}

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

app.use('/api/auth', authRoutes)
app.use('/api/nurse', nurseRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/doctor', doctorRoutes)
app.use('/api/pharmacist', pharmacistRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/patient', patientPortalRoutes)
app.use("/api/pharmacy", require("./routes/pharmacyRoutes"));

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

async function ensurePatientPortalSchema() {
  let connection
  try {
    connection = await oracledb.getConnection()

    // 1. Check if user_id column exists on patients table
    const colCheck = await connection.execute(
      `SELECT column_name FROM user_tab_cols WHERE table_name = 'PATIENTS' AND column_name = 'USER_ID'`
    )
    if (colCheck.rows.length === 0) {
      console.log('Adding user_id column to patients table...')
      await connection.execute(`
        BEGIN
          EXECUTE IMMEDIATE 'ALTER TABLE patients ADD (user_id NUMBER)';
        EXCEPTION
          WHEN OTHERS THEN
            IF SQLCODE != -1430 THEN RAISE; END IF;
        END;`)
    }

    // 2. Check if doctor_availability table exists
    const tableCheck = await connection.execute(
      `SELECT table_name FROM user_tables WHERE table_name = 'DOCTOR_AVAILABILITY'`
    )
    if (tableCheck.rows.length === 0) {
      console.log('Creating doctor_availability table...')
      await connection.execute(`
        BEGIN
          EXECUTE IMMEDIATE '
            CREATE TABLE doctor_availability (
              doctor_id    NUMBER NOT NULL,
              day_of_week  NUMBER NOT NULL,
              start_time   VARCHAR2(5) NOT NULL,
              end_time     VARCHAR2(5) NOT NULL,
              CONSTRAINT pk_doctor_availability PRIMARY KEY (doctor_id, day_of_week),
              CONSTRAINT fk_da_doctor FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE
            )';
        EXCEPTION
          WHEN OTHERS THEN
            IF SQLCODE != -955 THEN RAISE; END IF;
        END;`)
    }

    // Default Mon–Fri 09:00–17:00 for doctors with no schedule yet
    await connection.execute(`
      INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
      SELECT d.doctor_id, dw.day_of_week, '09:00', '17:00'
      FROM doctor d
      CROSS JOIN (
        SELECT 1 AS day_of_week FROM dual UNION ALL
        SELECT 2 FROM dual UNION ALL SELECT 3 FROM dual UNION ALL
        SELECT 4 FROM dual UNION ALL SELECT 5 FROM dual
      ) dw
      WHERE NOT EXISTS (
        SELECT 1 FROM doctor_availability da WHERE da.doctor_id = d.doctor_id
      )`)

    await connection.commit()
    console.log('Patient portal schema ready (patients.user_id, doctor_availability)')
  } catch (error) {
    console.warn('Patient portal schema check failed:', error.message)
  } finally {
    if (connection) {
      try { await connection.close() } catch { /* ignore */ }
    }
  }
}

async function start() {
  try {
    const poolConfig = {
      user: DB_USER,
      password: DB_PASSWORD,
      connectString: DB_CONNECT_STRING,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
    };

    if (WALLET_DIR) {
      poolConfig.walletLocation = process.env.TNS_ADMIN;
    }
    if (WALLET_PASSWORD) {
      poolConfig.walletPassword = WALLET_PASSWORD;
    }

    await oracledb.createPool(poolConfig)

    await ensurePatientPortalSchema()

    app.listen(Number(PORT), () => {
      console.log(`Server listening on http://localhost:${PORT}`)
      console.log(`Patient portal: POST http://localhost:${PORT}/api/patient/register`)
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
