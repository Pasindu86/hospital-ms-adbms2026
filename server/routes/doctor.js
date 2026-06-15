const express = require('express')
const jwt = require('jsonwebtoken')
const oracledb = require('oracledb')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod'

// ─── Auth Middleware ──────────────────────────────────────
function authDoctor(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
    if (decoded.role !== 'doctor') {
      return res.status(403).json({ error: 'Access denied. Doctor role required.' })
    }
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

router.use(authDoctor)

// ─── Helper: get DOCTOR_ID from JWT staff_id ─────────────
async function getDoctorId(connection, staffId) {
  const result = await connection.execute(
    `SELECT d.DOCTOR_ID
     FROM DOCTOR d
     JOIN USER_AUTH u ON u.FULL_NAME = d.NAME
     WHERE u.STAFF_ID = :sid AND u.ROLE = 'doctor'`,
    { sid: staffId }
  )
  return result.rows.length > 0 ? result.rows[0].DOCTOR_ID : null
}

// ═══════════════════════════════════════════════════════════
//  GET /appointments/today
//  Fetch today's patient queue for this doctor
// ═══════════════════════════════════════════════════════════
router.get('/appointments/today', async (req, res) => {
  let connection
  try {
    connection = await oracledb.getConnection()
    const doctorId = await getDoctorId(connection, req.user.staffId)
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor profile not found' })
    }

    const result = await connection.execute(
      `SELECT
         dp.PATIENT_ID AS APPOINTMENT_ID,
         dp.PATIENT_ID,
         p.NAME            AS PATIENT_NAME,
         p.PHONE_NUMBER,
         p.GENDER,
         p.DATE_OF_BIRTH,
         p.DISEASE,
         SYSDATE           AS APPOINTMENT_DATE,
         'Scheduled'       AS STATUS,
         ''                AS NOTES,
         ''                AS SYMPTOMS
       FROM DOCTOR_PATIENT dp
       JOIN PATIENT p ON dp.PATIENT_ID = p.PATIENT_ID
       WHERE dp.DOCTOR_ID = :doctorId`
      { doctorId }
    )
    res.json({ appointments: result.rows })
  } catch (error) {
    console.error('GET /appointments/today failed', error)
    res.status(500).json({ error: 'Database error' })
  } finally {
    if (connection) try { await connection.close() } catch (e) { /* ignore */ }
  }
})

// ═══════════════════════════════════════════════════════════
//  GET /patients/search?q=
//  Search patients by name, ID, or phone number
// ═══════════════════════════════════════════════════════════
router.get('/patients/search', async (req, res) => {
  const query = (req.query.q || '').trim()
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    const doctorId = await getDoctorId(connection, req.user.staffId)
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor profile not found' })
    }

    const result = await connection.execute(
      `SELECT DISTINCT p.PATIENT_ID, p.NAME, p.EMAIL, p.PHONE_NUMBER, p.GENDER, p.DATE_OF_BIRTH, p.DISEASE
       FROM PATIENT p
       JOIN PATIENT_DOCTOR_APPOINTMENT pda ON p.PATIENT_ID = pda.PATIENT_ID
       WHERE pda.DOCTOR_ID = :doctorId
         AND (
           UPPER(p.NAME) LIKE '%' || UPPER(:q) || '%'
           OR TO_CHAR(p.PATIENT_ID) = :q
           OR p.PHONE_NUMBER LIKE '%' || :q || '%'
         )
       ORDER BY p.NAME ASC
       FETCH FIRST 20 ROWS ONLY`,
      { q: query, doctorId: doctorId }
    )
    res.json({ patients: result.rows })
  } catch (error) {
    console.error('GET /patients/search failed', error)
    res.status(500).json({ error: 'Database error' })
  } finally {
    if (connection) try { await connection.close() } catch (e) { /* ignore */ }
  }
})

// ═══════════════════════════════════════════════════════════
//  GET /patients/:id/history
//  Get patient's full medical history (uses PL/SQL package)
// ═══════════════════════════════════════════════════════════
router.get('/patients/:id/history', async (req, res) => {
  const patientId = Number(req.params.id)
  let connection
  try {
    connection = await oracledb.getConnection()

    // Call PL/SQL package function via a simple query that mirrors the cursor logic
    const result = await connection.execute(
      `SELECT
         mr.RECORD_ID,
         mr.APPOINTMENT_ID,
         mr.DIAGNOSIS,
         mr.CLINICAL_ADVICE,
         mr.TREATMENT_NOTES,
         mr.RECORD_DATE,
         d.NAME            AS DOCTOR_NAME,
         d.SPECIALIST_AREA
       FROM MEDICAL_RECORD mr
       JOIN DOCTOR d ON mr.DOCTOR_ID = d.DOCTOR_ID
       WHERE mr.PATIENT_ID = :patientId
       ORDER BY mr.RECORD_DATE DESC`,
      { patientId }
    )

    // Also fetch prescriptions for each record
    const recordIds = result.rows.map(r => r.RECORD_ID)
    let prescriptions = []
    if (recordIds.length > 0) {
      const presResult = await connection.execute(
        `SELECT
           p.PRESCRIPTION_ID,
           p.RECORD_ID,
           p.PRESCRIBED_DATE,
           p.NOTES AS PRES_NOTES,
           pi.ITEM_ID,
           pi.DRUG_ID,
           ds.DRUG_NAME,
           ds.DRUG_CODE,
           pi.DOSAGE,
           pi.DURATION,
           pi.INSTRUCTIONS
         FROM PRESCRIPTION p
         JOIN PRESCRIPTION_ITEM pi ON p.PRESCRIPTION_ID = pi.PRESCRIPTION_ID
         JOIN DRUG_STOCK ds ON pi.DRUG_ID = ds.DRUG_ID
         WHERE p.RECORD_ID IN (${recordIds.join(',')})
         ORDER BY p.PRESCRIBED_DATE DESC`,
        {}
      )
      prescriptions = presResult.rows
    }

    res.json({ records: result.rows, prescriptions })
  } catch (error) {
    console.error('GET /patients/:id/history failed', error)
    res.status(500).json({ error: 'Database error' })
  } finally {
    if (connection) try { await connection.close() } catch (e) { /* ignore */ }
  }
})

// ═══════════════════════════════════════════════════════════
//  GET /patients/:id/lab-reports
//  Get patient's lab test results
// ═══════════════════════════════════════════════════════════
router.get('/patients/:id/lab-reports', async (req, res) => {
  const patientId = Number(req.params.id)
  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT
         lr.REPORT_ID,
         lr.TEST_NAME,
         lr.TEST_RESULT,
         lr.STATUS,
         lr.REPORT_DATE,
         d.NAME AS DOCTOR_NAME
       FROM LAB_REPORT lr
       LEFT JOIN DOCTOR d ON lr.DOCTOR_ID = d.DOCTOR_ID
       WHERE lr.PATIENT_ID = :patientId
       ORDER BY lr.REPORT_DATE DESC`,
      { patientId }
    )
    res.json({ labReports: result.rows })
  } catch (error) {
    console.error('GET /patients/:id/lab-reports failed', error)
    res.status(500).json({ error: 'Database error' })
  } finally {
    if (connection) try { await connection.close() } catch (e) { /* ignore */ }
  }
})

// ═══════════════════════════════════════════════════════════
//  POST /treatments
//  Save medical record using PKG_DOCTOR_OPS.SAVE_TREATMENT
// ═══════════════════════════════════════════════════════════
router.post('/treatments', async (req, res) => {
  const { appointmentId, patientId, diagnosis, clinicalAdvice, treatmentNotes } = req.body

  if (!appointmentId || !patientId || !diagnosis) {
    return res.status(400).json({ error: 'appointmentId, patientId, and diagnosis are required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    const doctorId = await getDoctorId(connection, req.user.staffId)
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor profile not found' })
    }

    // Call PL/SQL procedure
    const bindVars = {
      p_appointment_id:  appointmentId,
      p_patient_id:      patientId,
      p_doctor_id:       doctorId,
      p_diagnosis:       diagnosis,
      p_clinical_advice: clinicalAdvice || '',
      p_treatment_notes: treatmentNotes || '',
      p_record_id:       { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    }

    const result = await connection.execute(
      `BEGIN
         PKG_DOCTOR_OPS.SAVE_TREATMENT(
           :p_appointment_id, :p_patient_id, :p_doctor_id,
           :p_diagnosis, :p_clinical_advice, :p_treatment_notes,
           :p_record_id
         );
       END;`,
      bindVars
    )

    const recordId = result.outBinds.p_record_id
    res.status(201).json({ message: 'Treatment saved successfully', recordId })
  } catch (error) {
    console.error('POST /treatments failed', error)
    res.status(500).json({ error: 'Failed to save treatment' })
  } finally {
    if (connection) try { await connection.close() } catch (e) { /* ignore */ }
  }
})

// ═══════════════════════════════════════════════════════════
//  POST /prescriptions
//  Save prescription header + line items
//  Trigger TRG_DRUG_STOCK_DECREMENT fires automatically
// ═══════════════════════════════════════════════════════════
router.post('/prescriptions', async (req, res) => {
  const { recordId, patientId, notes, items } = req.body

  if (!recordId || !patientId || !items || items.length === 0) {
    return res.status(400).json({ error: 'recordId, patientId, and at least one item are required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    const doctorId = await getDoctorId(connection, req.user.staffId)
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor profile not found' })
    }

    // Insert prescription header
    const presResult = await connection.execute(
      `INSERT INTO PRESCRIPTION (RECORD_ID, PATIENT_ID, DOCTOR_ID, NOTES)
       VALUES (:recordId, :patientId, :doctorId, :notes)
       RETURNING PRESCRIPTION_ID INTO :prescriptionId`,
      {
        recordId,
        patientId,
        doctorId,
        notes: notes || '',
        prescriptionId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    )

    const prescriptionId = presResult.outBinds.prescriptionId[0]

    // Insert each line item (trigger fires per row)
    for (const item of items) {
      await connection.execute(
        `INSERT INTO PRESCRIPTION_ITEM (PRESCRIPTION_ID, DRUG_ID, DOSAGE, DURATION, INSTRUCTIONS)
         VALUES (:prescriptionId, :drugId, :dosage, :duration, :instructions)`,
        {
          prescriptionId,
          drugId: item.drugId,
          dosage: item.dosage,
          duration: item.duration,
          instructions: item.instructions || ''
        }
      )
    }

    await connection.commit()
    res.status(201).json({ message: 'Prescription saved successfully', prescriptionId })
  } catch (error) {
    console.error('POST /prescriptions failed', error)
    if (connection) try { await connection.rollback() } catch (e) { /* ignore */ }

    if (error.message && error.message.includes('Drug out of stock')) {
      return res.status(400).json({ error: 'One or more drugs are out of stock' })
    }
    res.status(500).json({ error: 'Failed to save prescription' })
  } finally {
    if (connection) try { await connection.close() } catch (e) { /* ignore */ }
  }
})

// ═══════════════════════════════════════════════════════════
//  GET /drugs/search?q=
//  Searchable drug list for prescription builder dropdown
// ═══════════════════════════════════════════════════════════
router.get('/drugs/search', async (req, res) => {
  const query = (req.query.q || '').trim()
  let connection
  try {
    connection = await oracledb.getConnection()
    const sql = query
      ? `SELECT DRUG_ID, DRUG_CODE, DRUG_NAME, QUANTITY, EXPIRE_DATE
         FROM DRUG_STOCK
         WHERE (UPPER(DRUG_NAME) LIKE '%' || UPPER(:q) || '%'
            OR UPPER(DRUG_CODE) LIKE '%' || UPPER(:q) || '%')
           AND QUANTITY > 0
           AND EXPIRE_DATE > SYSDATE
         ORDER BY DRUG_NAME ASC
         FETCH FIRST 30 ROWS ONLY`
      : `SELECT DRUG_ID, DRUG_CODE, DRUG_NAME, QUANTITY, EXPIRE_DATE
         FROM DRUG_STOCK
         WHERE QUANTITY > 0
           AND EXPIRE_DATE > SYSDATE
         ORDER BY DRUG_NAME ASC
         FETCH FIRST 30 ROWS ONLY`

    const binds = query ? { q: query } : {}
    const result = await connection.execute(sql, binds)
    res.json({ drugs: result.rows })
  } catch (error) {
    console.error('GET /drugs/search failed', error)
    res.status(500).json({ error: 'Database error' })
  } finally {
    if (connection) try { await connection.close() } catch (e) { /* ignore */ }
  }
})

module.exports = router
