const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const oracledb = require('oracledb')
const { jsDayToIso, generateSlots, combineDateAndSlot, parseTime } = require('../utils/slots')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod'
const JWT_EXPIRES_IN = '8h'

function outVal(bind) {
  return Array.isArray(bind) ? bind[0] : bind
}

function canEditAppointment(appointmentDate) {
  const appt = new Date(appointmentDate)
  const cutoff = new Date(Date.now() + 12 * 60 * 60 * 1000)
  return appt > cutoff
}

async function getAvailableSlots(connection, doctorId, dateStr) {
  const dateObj = new Date(`${dateStr}T12:00:00`)
  const dayOfWeek = jsDayToIso(dateObj.getDay())

  const availRes = await connection.execute(
    `SELECT start_time, end_time FROM doctor_availability
     WHERE doctor_id = :doctorId AND day_of_week = :dayOfWeek`,
    { doctorId, dayOfWeek }
  )

  if (availRes.rows.length === 0) {
    return { slots: [], hours: null, nextToken: 1, message: 'Doctor is not available on this day' }
  }

  const { START_TIME: startTime, END_TIME: endTime } = availRes.rows[0]
  let slots = generateSlots(startTime, endTime)

  const bookedRes = await connection.execute(
    `SELECT TO_CHAR(appointment_date, 'HH24:MI') AS slot_time
     FROM patient_doctor_appointment
     WHERE doctor_id = :doctorId
       AND TRUNC(appointment_date) = TO_DATE(:dateStr, 'YYYY-MM-DD')
       AND status NOT IN ('Cancelled')`,
    { doctorId, dateStr }
  )
  const booked = new Set(bookedRes.rows.map((r) => r.SLOT_TIME))
  slots = slots.filter((s) => !booked.has(s))

  const now = new Date()
  const isToday = dateStr === now.toISOString().slice(0, 10)
  if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    slots = slots.filter((s) => parseTime(s) > nowMinutes)
  }

  const tokenRes = await connection.execute(
    `SELECT NVL(MAX(TOKEN_NUMBER), 0) AS max_token
     FROM patient_doctor_appointment
     WHERE doctor_id = :doctorId
       AND TRUNC(appointment_date) = TO_DATE(:dateStr, 'YYYY-MM-DD')`,
    { doctorId, dateStr }
  )
  const nextToken = (tokenRes.rows[0]?.MAX_TOKEN || 0) + 1

  return {
    slots,
    hours: { start: startTime, end: endTime },
    nextToken,
    message: slots.length ? null : 'No slots left for this day',
  }
}

async function validateAppointmentSlot(connection, doctorId, appointmentDateIso) {
  const dateStr = appointmentDateIso.slice(0, 10)
  const dateObj = new Date(`${dateStr}T12:00:00`)
  const dayOfWeek = jsDayToIso(dateObj.getDay())

  const availRes = await connection.execute(
    `SELECT start_time, end_time FROM doctor_availability
     WHERE doctor_id = :doctorId AND day_of_week = :dayOfWeek`,
    { doctorId, dayOfWeek }
  )

  if (availRes.rows.length === 0) {
    throw new Error('Doctor is not available on this day')
  }
}

function authenticatePatient(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' })
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
    if (decoded.role !== 'patient') {
      return res.status(403).json({ error: 'Patient access only.' })
    }
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// ─── PUBLIC: hospital info + doctors for landing page ───
router.get('/public/doctors', async (req, res) => {
  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT d.doctor_id AS "doctorId",
              d.name AS "name",
              d.specialist_area AS "specialty",
              d.email AS "email",
              d.mobile_number AS "phone",
              NVL(d.consultation_fee, 0) + NVL(d.hospital_charge, 0) AS "totalFee"
       FROM doctor d
       JOIN user_auth u ON d.doctor_id = u.user_id
       WHERE u.is_active = 1
       ORDER BY d.name ASC`
    )

    const doctorIds = result.rows.map(r => r.doctorId)
    let availabilityMap = {}
    if (doctorIds.length > 0) {
      const availRes = await connection.execute(
        `SELECT doctor_id AS "doctorId",
                day_of_week AS "dayOfWeek",
                start_time AS "startTime",
                end_time AS "endTime"
         FROM doctor_availability
         WHERE doctor_id IN (${doctorIds.map((_, i) => `:id${i}`).join(',')})
         ORDER BY doctor_id, day_of_week`,
        doctorIds.reduce((acc, id, i) => { acc[`id${i}`] = id; return acc }, {})
      )
      for (const row of availRes.rows) {
        if (!availabilityMap[row.doctorId]) availabilityMap[row.doctorId] = []
        availabilityMap[row.doctorId].push({
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
        })
      }
    }

    const doctors = result.rows.map(doc => ({
      ...doc,
      availability: availabilityMap[doc.doctorId] || [],
    }))

    res.json(doctors)
  } catch (error) {
    console.error('GET /api/patient/public/doctors failed', error)
    res.status(500).json({ error: 'Failed to fetch doctors' })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

router.get('/public/doctors/:doctorId/slots', async (req, res) => {
  const doctorId = parseInt(req.params.doctorId, 10)
  const { date } = req.query

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Valid date query param required (YYYY-MM-DD)' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await getAvailableSlots(connection, doctorId, date)
    res.json({
      date,
      doctorId,
      nextToken: result.nextToken,
      message: result.message,
    })
  } catch (error) {
    console.error('GET /api/patient/public/doctors/:id/slots failed', error)
    res.status(500).json({ error: 'Failed to fetch token info' })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

router.get('/public/info', (_req, res) => {
  res.json({
    hospitalName: 'CarePulse Hospital',
    tagline: 'Compassionate Care, Advanced Medicine',
    about: 'CarePulse Hospital is a leading healthcare facility committed to providing world-class medical services. Our team of experienced doctors and nurses work around the clock to ensure your health and well-being.',
    address: '123 Health Avenue, Colombo, Sri Lanka',
    phone: '+94 11 234 5678',
    email: 'info@carepulse.lk',
    hours: 'Open 24/7 — Emergency services available round the clock',
    services: ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Emergency Care', 'Pharmacy'],
  })
})

// ─── PATIENT REGISTRATION (new patients — no manual setup needed) ───
router.post('/register', async (req, res) => {
  const { fullName, email, password, phoneNumber, address, dob, gender } = req.body

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' })
  }

  let connection
  try {
    const hash = await bcrypt.hash(password, 10)
    const dobDate = dob ? new Date(dob) : null

    connection = await oracledb.getConnection()

    const maxIdRes = await connection.execute(
      `SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(staff_id, '[^0-9]', ''))), 0) + 1 AS next_id
       FROM user_auth WHERE role = 'patient'`
    )
    const nextNum = maxIdRes.rows[0].NEXT_ID || 1
    const staffId = 'PT' + String(nextNum).padStart(3, '0')

    const authResult = await connection.execute(
      `INSERT INTO user_auth (staff_id, full_name, email, password_hash, role, is_active)
       VALUES (:staffId, :fullName, :email, :hash, 'patient', 1)
       RETURNING user_id INTO :userId`,
      {
        staffId,
        fullName,
        email,
        hash,
        userId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    )
    const userId = outVal(authResult.outBinds.userId)

    const patientResult = await connection.execute(
      `INSERT INTO patients (name, email, phone_number, address, date_of_birth, gender, user_id)
       VALUES (:fullName, :email, :phone, :address, :dob, :gender, :userId)
       RETURNING patient_id INTO :patientId`,
      {
        fullName,
        email,
        phone: phoneNumber || null,
        address: address || null,
        dob: dobDate,
        gender: gender || null,
        userId,
        patientId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    )
    const patientId = outVal(patientResult.outBinds.patientId)

    await connection.commit()

    const token = jwt.sign(
      { userId, staffId, patientId, role: 'patient', name: fullName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.status(201).json({
      token,
      user: { userId, staffId, patientId, name: fullName, role: 'patient' },
    })
  } catch (error) {
    console.error('POST /api/patient/register failed', error)
    if (connection) {
      try { await connection.rollback() } catch { /* ignore */ }
    }
    if (error.errorNum === 1) {
      return res.status(409).json({ error: 'Email already registered. Try logging in instead.' })
    }
    if (error.message?.includes('USER_ID') || error.errorNum === 904) {
      return res.status(500).json({
        error: 'Database not ready. Restart the server once — it will auto-setup patient tables.',
      })
    }
    res.status(500).json({ error: 'Registration failed: ' + error.message })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

// ─── PATIENT LOGIN ───
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT u.user_id, u.staff_id, u.full_name, u.password_hash, u.role, u.is_active,
              p.patient_id
       FROM user_auth u
       LEFT JOIN patients p ON p.user_id = u.user_id
       WHERE (u.email = :email OR u.staff_id = :email)
         AND u.role = 'patient'`,
      { email }
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials. Patient portal login requires a registered patient account. If you were added by reception, ask admin to enable portal login, or register at /patient/register.',
      })
    }

    const user = result.rows[0]
    if (!user.IS_ACTIVE) {
      return res.status(403).json({ error: 'Account is deactivated' })
    }

    const valid = await bcrypt.compare(password, user.PASSWORD_HASH)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      {
        userId: user.USER_ID,
        staffId: user.STAFF_ID,
        patientId: user.PATIENT_ID,
        role: 'patient',
        name: user.FULL_NAME,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      token,
      user: {
        userId: user.USER_ID,
        staffId: user.STAFF_ID,
        patientId: user.PATIENT_ID,
        name: user.FULL_NAME,
        role: 'patient',
      },
    })
  } catch (error) {
    console.error('POST /api/patient/login failed', error)
    res.status(500).json({ error: 'Server error' })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

// ─── GET MY APPOINTMENTS ───
router.get('/appointments', authenticatePatient, async (req, res) => {
  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT a.appointment_id AS "appointmentId",
              a.patient_id AS "patientId",
              a.doctor_id AS "doctorId",
              d.name AS "doctorName",
              d.specialist_area AS "specialty",
              TO_CHAR(a.appointment_date, 'YYYY-MM-DD"T"HH24:MI:SS') AS "appointmentDate",
              a.status AS "status",
              a.notes AS "notes",
              a.payment_method AS "paymentMethod",
              a.payment_status AS "paymentStatus",
              CASE WHEN a.appointment_date > SYSTIMESTAMP + INTERVAL '12' HOUR THEN 1 ELSE 0 END AS "canEdit"
       FROM patient_doctor_appointment a
       JOIN doctor d ON a.doctor_id = d.doctor_id
       WHERE a.patient_id = :patientId
       ORDER BY a.appointment_date DESC`,
      { patientId: req.user.patientId }
    )
    res.json(result.rows)
  } catch (error) {
    console.error('GET /api/patient/appointments failed', error)
    res.status(500).json({ error: 'Failed to fetch appointments' })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

// ─── GET AVAILABLE 15-MIN SLOTS FOR A DOCTOR ON A DATE ───
router.get('/doctors/:doctorId/slots', authenticatePatient, async (req, res) => {
  const doctorId = parseInt(req.params.doctorId, 10)
  const { date } = req.query

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Valid date query param required (YYYY-MM-DD)' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await getAvailableSlots(connection, doctorId, date)
    res.json({
      date,
      doctorId,
      slotMinutes: 15,
      hours: result.hours,
      slots: result.slots,
      nextToken: result.nextToken,
      message: result.message,
    })
  } catch (error) {
    console.error('GET /api/patient/doctors/:id/slots failed', error)
    res.status(500).json({ error: 'Failed to fetch time slots' })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

// ─── GET WEEKLY AVAILABILITY FOR A DOCTOR ───
router.get('/doctors/:doctorId/weekly-availability', authenticatePatient, async (req, res) => {
  const doctorId = parseInt(req.params.doctorId, 10)
  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT day_of_week AS "dayOfWeek",
              start_time AS "startTime",
              end_time AS "endTime"
       FROM doctor_availability
       WHERE doctor_id = :doctorId`,
      { doctorId }
    )
    res.json(result.rows)
  } catch (error) {
    console.error('GET /api/patient/doctors/:id/weekly-availability failed', error)
    res.status(500).json({ error: 'Failed to fetch doctor availability' })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

// ─── GET DOCTORS (authenticated patient) ───
router.get('/doctors', authenticatePatient, async (req, res) => {
  let connection
  try {
    connection = await oracledb.getConnection()
    const result = await connection.execute(
      `SELECT d.doctor_id AS "doctorId",
              d.name AS "name",
              d.specialist_area AS "specialty",
              d.email AS "email",
              d.consultation_fee AS "doctorFee",
              d.hospital_charge AS "hospitalFee",
              (SELECT MIN(da.start_time) || '-' || MAX(da.end_time)
               FROM doctor_availability da WHERE da.doctor_id = d.doctor_id) AS "hoursSummary"
       FROM doctor d
       JOIN user_auth u ON d.doctor_id = u.user_id
       WHERE u.is_active = 1
       ORDER BY d.name ASC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('GET /api/patient/doctors failed', error)
    res.status(500).json({ error: 'Failed to fetch doctors' })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

// ─── BOOK APPOINTMENT ───
router.post('/appointments', authenticatePatient, async (req, res) => {
  const { doctorId, appointmentDate, notes, paymentMethod } = req.body

  if (!doctorId || !appointmentDate) {
    return res.status(400).json({ error: 'Doctor and appointment date are required' })
  }

  const apptDate = new Date(appointmentDate)
  if (apptDate <= new Date()) {
    return res.status(400).json({ error: 'Appointment date must be in the future' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    await validateAppointmentSlot(connection, parseInt(doctorId, 10), appointmentDate)

    const result = await connection.execute(
      `INSERT INTO patient_doctor_appointment
         (patient_id, doctor_id, appointment_date, notes, status, payment_method, payment_status)
       VALUES (:patientId, :doctorId, :apptDate, :notes, 'Scheduled', :paymentMethod, 'Pending')
       RETURNING appointment_id, token_number INTO :appointmentId, :tokenNumber`,
      {
        patientId: req.user.patientId,
        doctorId: parseInt(doctorId, 10),
        apptDate,
        notes: notes || null,
        paymentMethod: paymentMethod || 'Cash',
        appointmentId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        tokenNumber: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    )

    try {
      await connection.execute(
        `INSERT INTO doctor_patient (doctor_id, patient_id) VALUES (:doctorId, :patientId)`,
        { doctorId: parseInt(doctorId, 10), patientId: req.user.patientId }
      )
    } catch (linkErr) {
      if (linkErr.errorNum !== 1) throw linkErr
    }

    await connection.commit()

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointmentId: outVal(result.outBinds.appointmentId),
      tokenNumber: outVal(result.outBinds.tokenNumber),
    })
  } catch (error) {
    console.error('POST /api/patient/appointments failed', error)
    if (connection) try { await connection.rollback() } catch { /* ignore */ }
    const msg = error.message || ''
    if (msg.includes('not available') || msg.includes('No slots')) {
      return res.status(400).json({ error: msg })
    }
    res.status(500).json({ error: 'Failed to book appointment: ' + msg })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

// ─── EDIT APPOINTMENT (12-hour rule) ───
router.put('/appointments/:id', authenticatePatient, async (req, res) => {
  const { doctorId, appointmentDate, notes, paymentMethod } = req.body
  const appointmentId = parseInt(req.params.id, 10)

  if (!doctorId || !appointmentDate) {
    return res.status(400).json({ error: 'Doctor and appointment date are required' })
  }

  const apptDate = new Date(appointmentDate)
  if (apptDate <= new Date()) {
    return res.status(400).json({ error: 'New appointment date must be in the future' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    const current = await connection.execute(
      `SELECT appointment_date, status FROM patient_doctor_appointment
       WHERE appointment_id = :id AND patient_id = :patientId`,
      { id: appointmentId, patientId: req.user.patientId }
    )

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const row = current.rows[0]
    if (row.STATUS !== 'Scheduled') {
      return res.status(400).json({ error: 'Only scheduled appointments can be edited' })
    }

    if (!canEditAppointment(row.APPOINTMENT_DATE)) {
      return res.status(403).json({
        error: 'Editing is allowed only when the appointment is more than 12 hours away',
      })
    }

    await validateAppointmentSlot(connection, parseInt(doctorId, 10), appointmentDate)

    await connection.execute(
      `UPDATE patient_doctor_appointment
       SET doctor_id = :doctorId, appointment_date = :apptDate, notes = :notes,
           payment_method = NVL(:paymentMethod, payment_method)
       WHERE appointment_id = :id AND patient_id = :patientId`,
      {
        doctorId: parseInt(doctorId, 10),
        apptDate,
        notes: notes || null,
        paymentMethod: paymentMethod || null,
        id: appointmentId,
        patientId: req.user.patientId,
      }
    )

    try {
      await connection.execute(
        `INSERT INTO doctor_patient (doctor_id, patient_id) VALUES (:doctorId, :patientId)`,
        { doctorId: parseInt(doctorId, 10), patientId: req.user.patientId }
      )
    } catch (linkErr) {
      if (linkErr.errorNum !== 1) throw linkErr
    }

    await connection.commit()
    res.json({ message: 'Appointment updated successfully' })
  } catch (error) {
    console.error('PUT /api/patient/appointments/:id failed', error)
    if (connection) try { await connection.rollback() } catch { /* ignore */ }
    res.status(500).json({ error: 'Failed to update appointment: ' + error.message })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

// ─── CANCEL APPOINTMENT ───
router.delete('/appointments/:id', authenticatePatient, async (req, res) => {
  const appointmentId = parseInt(req.params.id, 10)

  let connection
  try {
    connection = await oracledb.getConnection()
    const current = await connection.execute(
      `SELECT status FROM patient_doctor_appointment
       WHERE appointment_id = :id AND patient_id = :patientId`,
      { id: appointmentId, patientId: req.user.patientId }
    )

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const status = current.rows[0].STATUS
    if (status === 'Completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed appointment' })
    }
    if (status === 'Cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' })
    }

    await connection.execute(
      `UPDATE patient_doctor_appointment SET status = 'Cancelled'
       WHERE appointment_id = :id AND patient_id = :patientId`,
      { id: appointmentId, patientId: req.user.patientId }
    )
    await connection.commit()

    res.json({ message: 'Appointment cancelled successfully' })
  } catch (error) {
    console.error('DELETE /api/patient/appointments/:id failed', error)
    if (connection) try { await connection.rollback() } catch { /* ignore */ }
    res.status(500).json({ error: 'Failed to cancel appointment: ' + error.message })
  } finally {
    if (connection) try { await connection.close() } catch { /* ignore */ }
  }
})

module.exports = router
