const express = require('express')
const router = express.Router()
const oracledb = require('oracledb')

// GET /api/reception/doctors
router.get('/doctors', async (req, res) => {
  let connection
  try {
    connection = await oracledb.getConnection()
    
    // Assume HOSPITAL_FEE is standard, e.g., 500, we'll just return DOCTOR data
    // The DOCTOR table has DOCTOR_ID, NAME, SPECIALIST_AREA, CONSULTATION_FEE
    const result = await connection.execute(
      `SELECT DOCTOR_ID, NAME, SPECIALIST_AREA, NVL(CONSULTATION_FEE, 0) AS CONSULTATION_FEE 
       FROM DOCTOR 
       ORDER BY NAME ASC`
    )

    res.json({ doctors: result.rows })
  } catch (error) {
    console.error('GET /api/reception/doctors failed', error)
    res.status(500).json({ error: 'Database error fetching doctors' })
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (err) {
        console.error(err)
      }
    }
  }
})

// GET /api/reception/doctor/:id/token
router.get('/doctor/:id/token', async (req, res) => {
  const { id } = req.params
  const { date } = req.query // expecting YYYY-MM-DD
  
  if (!id) {
    return res.status(400).json({ error: 'Doctor ID is required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    
    let queryDate = new Date()
    if (date) {
        queryDate = new Date(date)
    }

    const result = await connection.execute(
      `SELECT NVL(MAX(TOKEN_NUMBER), 0) + 1 AS NEXT_TOKEN
       FROM PATIENT_DOCTOR_APPOINTMENT
       WHERE DOCTOR_ID = :doctorId
         AND TRUNC(APPOINTMENT_DATE) = TRUNC(:queryDate)`,
      {
        doctorId: parseInt(id, 10),
        queryDate: queryDate
      }
    )

    res.json({ nextToken: result.rows[0].NEXT_TOKEN })
  } catch (error) {
    console.error('GET /api/reception/doctor/token failed', error)
    res.status(500).json({ error: 'Database error fetching next token' })
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (err) {
        console.error(err)
      }
    }
  }
})

// GET /api/reception/doctor/:id/bookings
router.get('/doctor/:id/bookings', async (req, res) => {
  const { id } = req.params
  const { date } = req.query
  
  if (!id) {
    return res.status(400).json({ error: 'Doctor ID is required' })
  }

  let connection
  try {
    connection = await oracledb.getConnection()
    
    let queryDate = new Date()
    if (date) {
        queryDate = new Date(date)
    }

    const result = await connection.execute(
      `SELECT a.APPOINTMENT_ID, 
              p.NAME AS PATIENT_NAME, 
              a.APPOINTMENT_DATE, 
              a.TOKEN_NUMBER, 
              a.STATUS, 
              a.NOTES, 
              a.PAYMENT_METHOD, 
              a.PAYMENT_STATUS,
              bp.DOCTOR_FEE,
              bp.HOSPITAL_FEE,
              bp.TOTAL_AMOUNT
       FROM PATIENT_DOCTOR_APPOINTMENT a
       JOIN PATIENTS p ON a.PATIENT_ID = p.PATIENT_ID
       LEFT JOIN BOOKING_PAYMENT bp ON a.PATIENT_ID = bp.PATIENT_ID 
                                  AND a.DOCTOR_ID = bp.DOCTOR_ID 
                                  AND a.APPOINTMENT_DATE = bp.APPOINTMENT_DATE
       WHERE a.DOCTOR_ID = :doctorId
         AND TRUNC(a.APPOINTMENT_DATE) = TRUNC(:queryDate)
       ORDER BY a.TOKEN_NUMBER ASC, a.APPOINTMENT_DATE ASC`,
      {
        doctorId: parseInt(id, 10),
        queryDate: queryDate
      }
    )

    res.json({ bookings: result.rows })
  } catch (error) {
    console.error('GET /api/reception/doctor/bookings failed', error)
    res.status(500).json({ error: 'Database error fetching doctor bookings' })
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (err) {
        console.error(err)
      }
    }
  }
})

module.exports = router
