const express = require('express')
const oracledb = require('oracledb')
const jwt = require('jsonwebtoken')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod'

// Helper middleware to authenticate requests
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// GET all doctors
router.get('/doctors', authenticateToken, async (req, res) => {
  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT user_id AS "doctorId", 
              full_name AS "fullName", 
              email 
       FROM user_auth 
       WHERE role = 'doctor' AND is_active = 1
       ORDER BY full_name ASC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('GET /api/patients/doctors failed', error)
    res.status(500).json({ error: 'Failed to fetch doctors' })
  } finally {
    if (connection) {
      try { await connection.close() } catch (e) { /* ignore */ }
    }
  }
})

// GET all patients
router.get('/', authenticateToken, async (req, res) => {
  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT p.patient_id AS "patientId", 
              p.name, 
              p.email, 
              p.phone_number AS "phoneNumber", 
              p.address, 
              p.disease, 
              TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS "dob", 
              p.gender,
              d.user_id AS "doctorId",
              d.full_name AS "doctorName"
       FROM patients p
       LEFT JOIN doctor_patient dp ON p.patient_id = dp.patient_id
       LEFT JOIN user_auth d ON dp.doctor_id = d.user_id
       ORDER BY p.patient_id DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('GET /api/patients failed', error)
    res.status(500).json({ error: 'Failed to fetch patients' })
  } finally {
    if (connection) {
      try { await connection.close() } catch (e) { /* ignore */ }
    }
  }
})

// POST save a patient using PL/SQL procedure
router.post('/', authenticateToken, async (req, res) => {
  const { name, email, address, phoneNumber, disease, dob, gender, doctorId } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()

    // Convert dob string to JS Date for Oracle or handle null
    const dobDate = dob ? new Date(dob) : null
    
    // Parse doctorId (could be empty or null)
    const docIdNum = doctorId ? parseInt(doctorId, 10) : null

    // Execute the PL/SQL stored procedure
    const result = await connection.execute(
      `BEGIN
         save_patient(:patientId, :name, :email, :phoneNumber, :address, :disease, :dobDate, :gender, :doctorId);
       END;`,
      {
        patientId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        name,
        email: email || null,
        phoneNumber: phoneNumber || null,
        address: address || null,
        disease: disease || null,
        dobDate,
        gender: gender || null,
        doctorId: docIdNum
      },
      { autoCommit: true }
    )

    const newPatientId = result.outBinds.patientId

    res.status(200).json({ message: 'Patient record saved successfully', patientId: newPatientId })
  } catch (error) {
    console.error('POST /api/patients (PL/SQL) failed', error)
    res.status(500).json({ error: 'Database error saving patient record: ' + error.message })
  } finally {
    if (connection) {
      try { await connection.close() } catch (e) { /* ignore */ }
    }
  }
})

module.exports = router
