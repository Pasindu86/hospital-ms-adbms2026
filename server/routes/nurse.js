const express = require('express')
const jwt = require('jsonwebtoken')
const oracledb = require('oracledb')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod'

// ---------------------------------------------------------------------------
// Auth Middleware
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helper: safely convert Oracle value to a plain JS number
// ---------------------------------------------------------------------------
function toNum(val) {
    if (val === null || val === undefined) return null
    const n = Number(val)
    return isNaN(n) ? null : n
}

// ---------------------------------------------------------------------------
// Helper: resolve nurse profile from USER_AUTH userId
// Strategy:
//   1. Confirm user exists in USER_AUTH as a nurse
//   2. Try to find NURSE row where NURSE_ID = USER_ID  (for properly-created accounts)
//   3. Try to find NURSE row by matching EMAIL         (legacy/test data)
//   4. Return a minimal fallback so the dashboard still loads
// ---------------------------------------------------------------------------
async function getNurseProfile(connection, authUserId) {
    if (authUserId === null || authUserId === undefined) {
        return null
    }

    const numericId = toNum(authUserId)
    if (numericId === null) return null

    // Step 1 – Confirm nurse user in USER_AUTH
    let authRes
    try {
        authRes = await connection.execute(
            `SELECT USER_ID, FULL_NAME, EMAIL, ROLE FROM USER_AUTH
             WHERE USER_ID = :userId`,
            { userId: numericId }
        )
    } catch (e) {
        console.error('getNurseProfile – USER_AUTH query failed:', e.message)
        return null
    }

    // Now check if the role is nurse
    if (!authRes.rows || authRes.rows.length === 0) {
        return null
    }

    const foundUser = authRes.rows[0]
    if (foundUser.ROLE && foundUser.ROLE.toLowerCase() !== 'nurse') {
        return null
    }

    const authUser = authRes.rows[0]
    const authEmail = (authUser.EMAIL || '').trim()

    // Step 2 – Match NURSE by NURSE_ID = USER_ID
    try {
        const nurseRes = await connection.execute(
            `SELECT NURSE_ID, NAME, EMAIL, ADDRESS, PHONE_NUMBER, LICENSE_NUMBER, ALLOCATED_WARD
             FROM NURSE WHERE NURSE_ID = :userId`,
            { userId: numericId }
        )
        if (nurseRes.rows && nurseRes.rows.length > 0) {
            const row = nurseRes.rows[0]
            return {
                NURSE_ID: toNum(row.NURSE_ID),
                NAME: row.NAME,
                EMAIL: row.EMAIL,
                ADDRESS: row.ADDRESS,
                PHONE_NUMBER: row.PHONE_NUMBER,
                LICENSE_NUMBER: row.LICENSE_NUMBER,
                ALLOCATED_WARD: row.ALLOCATED_WARD,
                authUserId: numericId,
                isFallback: false
            }
        }
    } catch (e) {
        console.error('getNurseProfile – NURSE ID lookup failed:', e.message)
    }

    // Step 3 – Match by EMAIL
    if (authEmail) {
        try {
            const nurseEmailRes = await connection.execute(
                `SELECT NURSE_ID, NAME, EMAIL, ADDRESS, PHONE_NUMBER, LICENSE_NUMBER, ALLOCATED_WARD
                 FROM NURSE WHERE EMAIL = :email`,
                { email: authEmail }
            )
            if (nurseEmailRes.rows && nurseEmailRes.rows.length > 0) {
                const row = nurseEmailRes.rows[0]
                return {
                    NURSE_ID: toNum(row.NURSE_ID),
                    NAME: row.NAME,
                    EMAIL: row.EMAIL,
                    ADDRESS: row.ADDRESS,
                    PHONE_NUMBER: row.PHONE_NUMBER,
                    LICENSE_NUMBER: row.LICENSE_NUMBER,
                    ALLOCATED_WARD: row.ALLOCATED_WARD,
                    authUserId: numericId,
                    isFallback: false
                }
            }
        } catch (e) {
            console.error('getNurseProfile – NURSE email lookup failed:', e.message)
        }
    }

    // Step 4 – Fallback: user is in USER_AUTH as nurse but has no NURSE row yet
    return {
        NURSE_ID: numericId,
        NAME: authUser.FULL_NAME,
        EMAIL: authEmail,
        ADDRESS: null,
        PHONE_NUMBER: null,
        LICENSE_NUMBER: 'N/A',
        ALLOCATED_WARD: null,
        authUserId: numericId,
        isFallback: true
    }
}

// ---------------------------------------------------------------------------
// GET /me  – Profile + today's allocations + all allocations
// ---------------------------------------------------------------------------
router.get('/me', async (req, res) => {
    let connection
    try {
        connection = await oracledb.getConnection()
        const profile = await getNurseProfile(connection, req.user.userId)

        if (!profile) {
            return res.status(404).json({ error: 'Nurse user not found in auth' })
        }

        const nurseId = profile.NURSE_ID
        let allAllocations = []
        let todayAllocations = []
        let allWardAllocations = []
        let todayWardAllocations = []

        // Only fetch allocations when we have a real NURSE row
        if (!profile.isFallback && nurseId) {
            try {
                const allRes = await connection.execute(
                    `SELECT d.DOCTOR_ID, d.NAME, d.SPECIALIST_AREA,
                            a.SHIFT_DETAILS, a.ALLOCATION_DATE
                     FROM DOCTOR_NURSE_ALLOCATION a
                     JOIN DOCTOR d ON a.DOCTOR_ID = d.DOCTOR_ID
                     WHERE a.NURSE_ID = :nurseId
                     ORDER BY a.ALLOCATION_DATE DESC NULLS LAST`,
                    { nurseId }
                )
                allAllocations = allRes.rows || []

                const todayRes = await connection.execute(
                    `SELECT d.DOCTOR_ID, d.NAME, d.SPECIALIST_AREA,
                            a.SHIFT_DETAILS, a.ALLOCATION_DATE
                     FROM DOCTOR_NURSE_ALLOCATION a
                     JOIN DOCTOR d ON a.DOCTOR_ID = d.DOCTOR_ID
                     WHERE a.NURSE_ID = :nurseId
                       AND TRUNC(NVL(a.ALLOCATION_DATE, SYSDATE)) = TRUNC(SYSDATE)
                     ORDER BY a.ALLOCATION_DATE DESC NULLS LAST`,
                    { nurseId }
                )
                todayAllocations = todayRes.rows || []

                // Fetch ALL Ward allocations
                const allWardRes = await connection.execute(
                    `SELECT WARD_NAME, SHIFT_DETAILS, ALLOCATION_DATE
                     FROM NURSE_WARD_ALLOCATION
                     WHERE NURSE_ID = :nurseId
                     ORDER BY ALLOCATION_DATE DESC NULLS LAST`,
                    { nurseId }
                )
                allWardAllocations = allWardRes.rows || []

                // Fetch Ward allocations for today
                const todayWardRes = await connection.execute(
                    `SELECT WARD_NAME, SHIFT_DETAILS, ALLOCATION_DATE
                     FROM NURSE_WARD_ALLOCATION
                     WHERE NURSE_ID = :nurseId
                       AND TRUNC(NVL(ALLOCATION_DATE, SYSDATE)) = TRUNC(SYSDATE)
                     ORDER BY ALLOCATION_DATE DESC NULLS LAST`,
                    { nurseId }
                )
                todayWardAllocations = todayWardRes.rows || []
            } catch (e) {
                console.error('GET /api/nurse/me – allocation query failed:', e.message)
                // Non-fatal – return empty arrays
            }
        }

        res.json({ profile, allocations: allAllocations, todayAllocations, wardAllocations: allWardAllocations, todayWardAllocations })

    } catch (error) {
        console.error('GET /api/nurse/me failed:', error.message || error)
        res.status(500).json({ error: 'Database error', detail: error.message })
    } finally {
        if (connection) try { await connection.close() } catch (e) { }
    }
})

// ---------------------------------------------------------------------------
// GET /ward/details  – Other nurses in same ward + patient count
// ---------------------------------------------------------------------------
router.get('/ward/details', async (req, res) => {
    let connection
    try {
        connection = await oracledb.getConnection()
        const profile = await getNurseProfile(connection, req.user.userId)

        if (!profile) {
            return res.status(404).json({ error: 'Nurse user not found' })
        }

        const ward = profile.ALLOCATED_WARD
        if (!ward) {
            return res.json({ wardName: 'Unassigned', nurses: [], patientCount: 0 })
        }

        const nurseId = profile.NURSE_ID

        let wardNurses = []
        try {
            const nursesRes = await connection.execute(
                `SELECT NAME, LICENSE_NUMBER, EMAIL, PHONE_NUMBER
                 FROM NURSE
                 WHERE ALLOCATED_WARD = :ward
                   AND NURSE_ID != :myId`,
                { ward, myId: nurseId }
            )
            wardNurses = nursesRes.rows || []
        } catch (e) {
            console.error('GET /api/nurse/ward/details – nurses query failed:', e.message)
        }

        let totalPatients = 0
        try {
            const patientsRes = await connection.execute(
                `SELECT COUNT(1) AS TOTAL_CNT FROM PATIENTS`
            )
            if (patientsRes.rows && patientsRes.rows[0]) {
                totalPatients = toNum(patientsRes.rows[0].TOTAL_CNT) || 0
            }
        } catch (e) {
            console.error('GET /api/nurse/ward/details – patient count failed:', e.message)
        }

        res.json({ wardName: ward, nurses: wardNurses, patientCount: totalPatients })

    } catch (error) {
        console.error('GET /api/nurse/ward/details failed:', error.message || error)
        res.status(500).json({ error: 'Database error', detail: error.message })
    } finally {
        if (connection) try { await connection.close() } catch (e) { }
    }
})

// ---------------------------------------------------------------------------
// GET /ward/patients  – Recent 10 patients
// ---------------------------------------------------------------------------
router.get('/ward/patients', async (req, res) => {
    let connection
    try {
        connection = await oracledb.getConnection()

        // Verify user is a valid nurse first
        const numericId = toNum(req.user.userId)
        if (!numericId) {
            return res.status(401).json({ error: 'Invalid session' })
        }

        const result = await connection.execute(
            `SELECT PATIENT_ID, NAME, GENDER, DISEASE, PHONE_NUMBER
             FROM PATIENTS
             ORDER BY PATIENT_ID DESC
             FETCH FIRST 10 ROWS ONLY`
        )
        res.json({ patients: result.rows || [] })

    } catch (error) {
        console.error('GET /api/nurse/ward/patients failed:', error.message || error)
        res.status(500).json({ error: 'Database error', detail: error.message })
    } finally {
        if (connection) try { await connection.close() } catch (e) { }
    }
})

module.exports = router
