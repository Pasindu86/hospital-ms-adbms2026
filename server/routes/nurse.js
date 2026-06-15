const express = require('express')
const jwt = require('jsonwebtoken')
const oracledb = require('oracledb')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod'

// Auth Middleware
function authNurse(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
    }
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
        if (decoded.role !== 'nurse') {
            return res.status(403).json({ error: 'Access denied. Nurse role required.' })
        }
        req.user = decoded
        next()
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' })
    }
}

router.use(authNurse)

// Helper: get NURSE_ID and Profile from JWT staff_id
async function getNurseProfile(connection, staffId) {
    // First, get basic info from USER_AUTH
    const authRes = await connection.execute(
        `SELECT USER_ID, FULL_NAME, EMAIL, STAFF_ID FROM USER_AUTH WHERE STAFF_ID = :sid AND ROLE = 'nurse'`,
        { sid: staffId }
    )
    if (authRes.rows.length === 0) return null

    const authUser = authRes.rows[0];

    // Try to find matching record in NURSE table
    const nurseRes = await connection.execute(
        `SELECT NURSE_ID, NAME, EMAIL, ADDRESS, PHONE_NUMBER, LICENSE_NUMBER, ALLOCATED_WARD
     FROM NURSE
     WHERE NAME = :name OR EMAIL = :email`,
        { name: authUser.FULL_NAME, email: authUser.EMAIL }
    )

    if (nurseRes.rows.length > 0) {
        return { ...nurseRes.rows[0], authUserId: authUser.USER_ID };
    }

    // Fallback: return data from USER_AUTH
    return {
        NURSE_ID: authUser.USER_ID,
        NAME: authUser.FULL_NAME,
        EMAIL: authUser.EMAIL,
        LICENSE_NUMBER: 'N/A',
        ALLOCATED_WARD: 'Unassigned',
        isFallback: true
    };
}

// GET /me - Fetch nurse profile, assigned doctor and ward
router.get('/me', async (req, res) => {
    let connection
    try {
        connection = await oracledb.getConnection()
        const profile = await getNurseProfile(connection, req.user.staffId)
        if (!profile) {
            return res.status(404).json({ error: 'Nurse user not found in auth' })
        }

        // Fetch allocated doctors (using either NURSE_ID or USER_ID)
        const doctorsRes = await connection.execute(
            `SELECT d.DOCTOR_ID, d.NAME, d.SPECIALIST_AREA, a.SHIFT_DETAILS, a.ALLOCATION_DATE
       FROM DOCTOR_NURSE_ALLOCATION a
       JOIN DOCTOR d ON a.DOCTOR_ID = d.DOCTOR_ID
       WHERE a.NURSE_ID = :nurseId
       ORDER BY a.ALLOCATION_DATE DESC`,
            { nurseId: profile.NURSE_ID }
        )

        res.json({
            profile: profile,
            allocations: doctorsRes.rows
        })
    } catch (error) {
        console.error('GET /api/nurse/me failed', error)
        res.status(500).json({ error: 'Database error' })
    } finally {
        if (connection) try { await connection.close() } catch (e) { }
    }
})

// GET /ward/patients - Fetch patients in the same ward
router.get('/ward/patients', async (req, res) => {
    let connection
    try {
        connection = await oracledb.getConnection()
        const profile = await getNurseProfile(connection, req.user.staffId)
        if (!profile) {
            return res.status(404).json({ error: 'Nurse user not found' })
        }

        const ward = profile.ALLOCATED_WARD

        if (!ward || ward === 'Unassigned') {
            return res.json({ patients: [] })
        }

        // This is a placeholder logic as patients aren't explicitly assigned to wards in the current schema
        // but we can fetch patients who have active appointments today as a surrogate
        // or patients who might have 'ward' in their notes/disease.
        // For now, let's just return recently registered patients as a demonstration.
        const result = await connection.execute(
            `SELECT PATIENT_ID, NAME, GENDER, DISEASE, PHONE_NUMBER
         FROM PATIENTS
         ORDER BY PATIENT_ID DESC
         FETCH FIRST 10 ROWS ONLY`
        )
        res.json({ patients: result.rows })
    } catch (error) {
        console.error('GET /api/nurse/ward/patients failed', error)
        res.status(500).json({ error: 'Database error' })
    } finally {
        if (connection) try { await connection.close() } catch (e) { }
    }
})

module.exports = router
