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
      `SELECT d.doctor_id AS "doctorId", 
              d.name AS "fullName", 
              d.email,
              d.consultation_fee AS "consultationFee",
              d.hospital_charge AS "hospitalCharge"
       FROM doctor d
       JOIN user_auth u ON d.doctor_id = u.user_id
       WHERE u.is_active = 1
       ORDER BY d.name ASC`
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
              p.name AS "name", 
              p.email AS "email", 
              p.phone_number AS "phoneNumber", 
              p.address AS "address", 
              p.disease AS "disease", 
              TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS "dob", 
              p.gender AS "gender",
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

// POST allocate a doctor to a patient
router.post('/allocate', authenticateToken, async (req, res) => {
  const { doctorId, patientId } = req.body

  if (!doctorId || !patientId) {
    return res.status(400).json({ error: 'Doctor ID and Patient ID are required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    await connection.execute(
      `BEGIN
         allocate_doctor_to_patient(:doctorId, :patientId);
       END;`,
      {
        doctorId: parseInt(doctorId, 10),
        patientId: parseInt(patientId, 10)
      },
      { autoCommit: true }
    )

    res.status(200).json({ message: 'Doctor allocated to patient successfully' })
  } catch (error) {
    console.error('POST /api/patients/allocate failed', error)
    res.status(500).json({ error: 'Database error allocating doctor: ' + error.message })
  } finally {
    if (connection) {
      try { await connection.close() } catch (e) { /* ignore */ }
    }
  }
})

// POST book an appointment
router.post('/appointment', authenticateToken, async (req, res) => {
  const { patientId, doctorId, appointmentDate, symptoms, notes, paymentMethod, paymentStatus, doctorCharges, hospitalCharges } = req.body

  if (!patientId || !doctorId || !appointmentDate) {
    return res.status(400).json({ error: 'Patient ID, Doctor ID, and Date are required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()

    const apptDate = new Date(appointmentDate)

    await connection.execute(
      `DECLARE
         v_patient_name VARCHAR2(100);
         v_doctor_name VARCHAR2(100);
         v_payment_id NUMBER;
       BEGIN
         SELECT name INTO v_patient_name FROM patients WHERE patient_id = :patientId;
         SELECT name INTO v_doctor_name FROM doctor WHERE doctor_id = :doctorId;
         
         INSERT INTO PATIENT_DOCTOR_APPOINTMENT 
          (PATIENT_ID, DOCTOR_ID, APPOINTMENT_DATE, NOTES, STATUS, PAYMENT_METHOD, PAYMENT_STATUS)
         VALUES 
          (:patientId, :doctorId, :appointmentDate, :notes, 'Scheduled', :paymentMethod, :paymentStatus);
          
         SAVE_BOOKING_PAYMENT(
            :patientId, :doctorId, v_patient_name, v_doctor_name, 
            :appointmentDate, :doctorCharges, :hospitalCharges, 
            :paymentMethod, :paymentStatus, v_payment_id
         );
       END;`,
      {
        patientId: parseInt(patientId, 10),
        doctorId: parseInt(doctorId, 10),
        appointmentDate: apptDate,
        notes: notes || null,
        paymentMethod: paymentMethod || 'Cash',
        paymentStatus: paymentStatus || 'Pending',
        doctorCharges: parseFloat(doctorCharges) || 0,
        hospitalCharges: parseFloat(hospitalCharges) || 500
      },
      { autoCommit: true }
    )

    // Optional: Update doctor_patient link
    try {
      await connection.execute(
        `DELETE FROM doctor_patient WHERE patient_id = :patientId AND doctor_id = :doctorId`,
        { patientId: parseInt(patientId, 10), doctorId: parseInt(doctorId, 10) },
        { autoCommit: true }
      )
      await connection.execute(
        `INSERT INTO doctor_patient (doctor_id, patient_id) VALUES (:doctorId, :patientId)`,
        { doctorId: parseInt(doctorId, 10), patientId: parseInt(patientId, 10) },
        { autoCommit: true }
      )
    } catch (linkErr) {
      console.warn('Failed to update doctor_patient link, continuing...', linkErr)
    }

    res.status(200).json({ message: 'Appointment booked successfully' })
  } catch (error) {
    console.error('POST /api/patients/appointment failed', error)
    res.status(500).json({ error: 'Database error booking appointment: ' + error.message })
  } finally {
    if (connection) {
      try { await connection.close() } catch (e) { /* ignore */ }
    }
  }
})

module.exports = router
