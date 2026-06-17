const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const oracledb = require('oracledb')

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod'
const JWT_EXPIRES_IN = '8h'

router.post('/login', async (req, res) => {
  const { staffId, password } = req.body

  if (!staffId || !password) {
    return res.status(400).json({ error: 'Staff ID and password are required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT u.user_id, u.staff_id, u.full_name, u.email, u.password_hash, u.role, u.is_active,
              p.patient_id
       FROM user_auth u
       LEFT JOIN patients p ON p.user_id = u.user_id
       WHERE u.staff_id = :sid OR u.email = :eid`,
      { sid: staffId, eid: staffId }
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]

    if (!user.IS_ACTIVE) {
      return res.status(403).json({ error: 'Account is deactivated' })
    }

    const validPassword = await bcrypt.compare(password, user.PASSWORD_HASH)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const tokenPayload = {
      userId: user.USER_ID,
      staffId: user.STAFF_ID,
      role: user.ROLE,
      name: user.FULL_NAME,
    }
    if (user.PATIENT_ID) tokenPayload.patientId = user.PATIENT_ID

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    const userResponse = {
      userId: user.USER_ID,
      staffId: user.STAFF_ID,
      name: user.FULL_NAME,
      role: user.ROLE,
    }
    if (user.PATIENT_ID) userResponse.patientId = user.PATIENT_ID

    res.json({ token, user: userResponse })
  } catch (error) {
    console.error('POST /api/auth/login failed', error)
    res.status(500).json({ error: 'Server error' })
  } finally {
    if (connection) {
      try { await connection.close() } catch (e) { /* ignore */ }
    }
  }
})

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    res.json({
      userId: decoded.userId,
      staffId: decoded.staffId,
      name: decoded.name,
      role: decoded.role,
    })
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
})

router.post('/register', async (req, res) => {
  const { fullName, email, password, role } = req.body

  if (!fullName || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  let connection
  try {
    const hash = await bcrypt.hash(password, 10)
    connection = await oracledb.getConnection()
    
    const maxIdRes = await connection.execute(
      `SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(staff_id, '[^0-9]', ''))), 0) + 1 AS next_id 
       FROM user_auth WHERE role = :role`,
      { role: role }
    );
    const nextId = maxIdRes.rows[0].NEXT_ID || 1;
    const prefixMap = { doctor: 'D', nurse: 'N', pharmacist: 'P', reception: 'R', admin: 'A', patient: 'PT' };
    const prefix = prefixMap[role] || 'S';
    const generatedStaffId = prefix + String(nextId).padStart(3, '0');

    await connection.execute(
      `INSERT INTO user_auth (staff_id, full_name, email, password_hash, role, is_active)
       VALUES (:staffId, :fullName, :email, :hash, :role, 1)`,
      { staffId: generatedStaffId, fullName, email: email || null, hash, role },
      { autoCommit: true }
    )
    res.status(201).json({ message: 'User registered successfully' })
  } catch (error) {
    console.error('POST /api/auth/register failed', error)
    if (error.errorNum === 1) {
      return res.status(409).json({ error: 'User ID or Email already exists' })
    }
    res.status(500).json({ error: 'Server error during registration' })
  } finally {
    if (connection) {
      try { await connection.close() } catch (e) { /* ignore */ }
    }
  }
})

module.exports = router
