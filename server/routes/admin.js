const express = require('express');
const bcrypt = require('bcryptjs');
const oracledb = require('oracledb');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod';

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

router.get('/nurses', verifyAdmin, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT nurse_id, name, allocated_ward FROM nurse ORDER BY name ASC`
        );
        res.json({ nurses: result.rows });
    } catch (error) {
        console.error('GET /api/admin/nurses failed', error);
        res.status(500).json({ error: 'Failed to fetch nurses' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { /* ignore */ }
        }
    }
});

router.post('/register-doctor', verifyAdmin, async (req, res) => {
    const {
        staffId, fullName, email, password, role,
        const {
            fullName, email, password, role,
            mobileNumber, address, licenseNumber, specialistArea, nurses
        } = req.body;

    if (role !== 'doctor') {
        return res.status(400).json({ error: 'Invalid role for this endpoint' });
    }

    if (!staffId || !fullName || !password) {
        if (!fullName || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let connection;
        try {
            const hash = await bcrypt.hash(password, 10);
            connection = await oracledb.getConnection();

            const nurseIdsCsv = (nurses || []).join(',');


            const nurseIdsCsv = (nurses || []).join(',');

            // Auto-generate STAFF_ID for doctor
            const maxIdRes = await connection.execute(
                `SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(staff_id, '[^0-9]', ''))), 0) + 1 AS next_id 
             FROM user_auth WHERE role = 'doctor'`
            );
            const generatedStaffId = 'D' + String(maxIdRes.rows[0].NEXT_ID || 1).padStart(3, '0');

            const result = await connection.execute(
                `BEGIN
                PKG_ADMIN_OPS.REGISTER_DOCTOR(
                    p_staff_id => :staffId,
                    p_full_name => :fullName,
                    p_email => :email,
                    p_password_hash => :passwordHash,
                    p_license_number => :licenseNumber,
                    p_address => :address,
                    p_mobile_number => :mobileNumber,
                    p_specialist_area => :specialistArea,
                    p_nurse_ids_csv => :nurseIdsCsv,
                    p_user_id => :outUserId
                );
            END;`,
                {
                    staffId: staffId,
                    staffId: generatedStaffId,
                    fullName: fullName,
                    email: email || '',
                    passwordHash: hash,
                    licenseNumber: licenseNumber || '',
                    address: address || '',
                    mobileNumber: mobileNumber || '',
                    specialistArea: specialistArea || '',
                    nurseIdsCsv: nurseIdsCsv,
                    outUserId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                },
                { autoCommit: true }
            );

            res.status(201).json({
                message: 'Doctor registered successfully',
                userId: result.outBinds.outUserId
        res.status(201).json({
                    message: 'Doctor registered successfully',
                    userId: result.outBinds.outUserId
                });

            } catch (error) {
                console.error('POST /api/admin/register-doctor failed', error);
                if (error.errorNum === 1 || error.message.includes('ORA-00001')) {
                    return res.status(409).json({ error: 'Staff ID or Email already exists' });
                }
                res.status(500).json({ error: 'Server error during registration' });
            } finally {
                if (connection) {
                    try { await connection.close(); } catch (e) { /* ignore */ }
                }
            }
        });

router.post('/register-nurse', verifyAdmin, async (req, res) => {
    const {
        staffId, fullName, email, password, role,
        const {
            fullName, email, password, role,
            mobileNumber, address, licenseNumber, allocatedWard
        } = req.body;

    if (role !== 'nurse') {
        return res.status(400).json({ error: 'Invalid role for this endpoint' });
    }

    if (!staffId || !fullName || !password) {
        if (!fullName || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let connection;
        try {
            const hash = await bcrypt.hash(password, 10);
            connection = await oracledb.getConnection();

            // Auto-generate STAFF_ID for nurse
            const maxIdRes = await connection.execute(
                `SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(staff_id, '[^0-9]', ''))), 0) + 1 AS next_id 
             FROM user_auth WHERE role = 'nurse'`
            );
            const generatedStaffId = 'N' + String(maxIdRes.rows[0].NEXT_ID || 1).padStart(3, '0');

            const result = await connection.execute(
                `DECLARE
                v_user_id NUMBER;
            BEGIN
                INSERT INTO user_auth (staff_id, full_name, email, password_hash, role, is_active)
                VALUES (:staffId, :fullName, :email, :passwordHash, 'nurse', 1)
                RETURNING user_id INTO v_user_id;

                INSERT INTO nurse (nurse_id, name, email, license_number, address, phone_number, allocated_ward)
                VALUES (v_user_id, :fullName, :email, :licenseNumber, :address, :mobileNumber, :allocatedWard);

                :outUserId := v_user_id;
            END;`,
                {
                    staffId: staffId,
                    staffId: generatedStaffId,
                    fullName: fullName,
                    email: email || '',
                    passwordHash: hash,
                    licenseNumber: licenseNumber || '',
                    address: address || '',
                    mobileNumber: mobileNumber || '',
                    allocatedWard: allocatedWard || '',
                    outUserId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                },
                { autoCommit: true }
            );

            res.status(201).json({
                message: 'Nurse registered successfully',
                userId: result.outBinds.outUserId
        res.status(201).json({
                    message: 'Nurse registered successfully',
                    userId: result.outBinds.outUserId
                });

            } catch (error) {
                console.error('POST /api/admin/register-nurse failed', error);
                if (error.errorNum === 1 || error.message.includes('ORA-00001')) {
                    return res.status(409).json({ error: 'Staff ID, Email, or License Number already exists' });
                }
                res.status(500).json({ error: 'Server error during registration' });
            } finally {
                if (connection) {
                    try { await connection.close(); } catch (e) { /* ignore */ }
                }
            }
        });

// NEW: Get all doctors
router.get('/doctors', verifyAdmin, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT doctor_id, name, specialist_area FROM doctor ORDER BY name ASC`
        );
        res.json({ doctors: result.rows });
    } catch (error) {
        console.error('GET /api/admin/doctors failed', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { /* ignore */ }
        }
    }
});

// ---------------------------------------------------------------------------
// POST /allocate-doctor-duty
// ---------------------------------------------------------------------------
router.post('/allocate-doctor-duty', verifyAdmin, async (req, res) => {
    const { nurseId, doctorId, allocationDate, shiftTime } = req.body;

    if (!nurseId || !doctorId || !allocationDate || !shiftTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let connection;
    try {
        connection = await oracledb.getConnection();

        const shiftDetails = `${shiftTime}`;
        await connection.execute(
            `INSERT INTO doctor_nurse_allocation (doctor_id, nurse_id, shift_details, allocation_date)
             VALUES (:doctorId, :nurseId, :shiftDetails, TO_TIMESTAMP(:allocationDate, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))`,
            {
                doctorId: doctorId,
                nurseId: nurseId,
                shiftDetails: shiftDetails,
                allocationDate: allocationDate
            },
            { autoCommit: true }
        );

        res.status(200).json({ message: 'Doctor duty allocated successfully' });
    } catch (error) {
        console.error('POST /api/admin/allocate-doctor-duty failed', error);
        res.status(500).json({ error: 'Failed to allocate doctor duty' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { /* ignore */ }
        }
    }
});

// ---------------------------------------------------------------------------
// POST /allocate-ward-duty
// ---------------------------------------------------------------------------
router.post('/allocate-ward-duty', verifyAdmin, async (req, res) => {
    const { nurseId, allocatedWard, allocationDate, shiftTime } = req.body;

    if (!nurseId || !allocatedWard || !allocationDate || !shiftTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let connection;
    try {
        connection = await oracledb.getConnection();

        // Also update the static allocated_ward field on the nurse table to keep compatibility
        await connection.execute(
            `UPDATE nurse SET allocated_ward = :ward WHERE nurse_id = :nurseId`,
            { ward: allocatedWard, nurseId: nurseId },
            { autoCommit: false }
        );

        const shiftDetails = `${shiftTime}`;
        await connection.execute(
            `INSERT INTO nurse_ward_allocation (nurse_id, ward_name, shift_details, allocation_date)
             VALUES (:nurseId, :wardName, :shiftDetails, TO_TIMESTAMP(:allocationDate, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'))`,
            {
                nurseId: nurseId,
                wardName: allocatedWard,
                shiftDetails: shiftDetails,
                allocationDate: allocationDate
            },
            { autoCommit: true }
        );

        res.status(200).json({ message: 'Ward duty allocated successfully' });
    } catch (error) {
        console.error('POST /api/admin/allocate-ward-duty failed', error);
        res.status(500).json({ error: 'Failed to allocate ward duty' });
        router.get('/dashboard-stats', verifyAdmin, async (req, res) => {
            let connection;
            try {
                connection = await oracledb.getConnection();

                const counts = await connection.execute(`
            SELECT 
                (SELECT COUNT(*) FROM user_auth WHERE role = 'doctor' AND is_active = 1) as total_doctors,
                (SELECT COUNT(*) FROM patient) as total_patients,
                (SELECT COUNT(*) FROM doctor_patient) as active_appointments,
                (SELECT COUNT(*) FROM user_auth WHERE role = 'nurse' AND is_active = 1) as total_nurses
            FROM DUAL
        `);

                const staffDataRes = await connection.execute(`
            SELECT 
                u.USER_ID, 
                u.FULL_NAME, 
                u.ROLE, 
                u.IS_ACTIVE,
                d.SPECIALIST_AREA,
                n.ALLOCATED_WARD
            FROM USER_AUTH u
            LEFT JOIN DOCTOR d ON u.USER_ID = d.DOCTOR_ID AND u.ROLE = 'doctor'
            LEFT JOIN NURSE n ON u.USER_ID = n.NURSE_ID AND u.ROLE = 'nurse'
            WHERE u.ROLE IN ('doctor', 'nurse', 'reception', 'pharmacist', 'admin')
            ORDER BY u.FULL_NAME ASC
        `);

                res.json({
                    stats: counts.rows[0],
                    staffData: staffDataRes.rows
                });
            } catch (error) {
                console.error('GET /api/admin/dashboard-stats failed', error);
                res.status(500).json({ error: 'Failed to fetch dashboard stats' });
            } finally {
                if (connection) {
                    try { await connection.close(); } catch (e) { /* ignore */ }
                }
            }
        });
        // ═══════════════════════════════════════════════════════════
        //  GET /api/admin/staff/:role
        //  Fetch staff details using PL/SQL ref cursor
        // ═══════════════════════════════════════════════════════════
        router.get('/staff/:role', verifyAdmin, async (req, res) => {
            let connection;
            try {
                connection = await oracledb.getConnection();
                const role = req.params.role.toLowerCase();

                const result = await connection.execute(
                    `DECLARE
                c_staff SYS_REFCURSOR;
             BEGIN
                IF :role = 'doctor' THEN
                    OPEN c_staff FOR 
                        SELECT u.user_id, u.staff_id, u.full_name, u.email, u.role, u.is_active,
                               d.license_number, d.specialist_area AS specialized_info
                        FROM user_auth u JOIN doctor d ON u.user_id = d.doctor_id WHERE u.role = 'doctor';
                ELSIF :role = 'nurse' THEN
                    OPEN c_staff FOR
                        SELECT u.user_id, u.staff_id, u.full_name, u.email, u.role, u.is_active,
                               n.license_number, n.allocated_ward AS specialized_info
                        FROM user_auth u JOIN nurse n ON u.user_id = n.nurse_id WHERE u.role = 'nurse';
                ELSIF :role = 'pharmacist' THEN
                    OPEN c_staff FOR
                        SELECT u.user_id, u.staff_id, u.full_name, u.email, u.role, u.is_active,
                               p.license_number, NULL AS specialized_info
                        FROM user_auth u JOIN pharmaceutical p ON u.user_id = p.pharmaceutical_id WHERE u.role = 'pharmacist';
                ELSE
                    OPEN c_staff FOR
                        SELECT user_id, staff_id, full_name, email, role, is_active,
                               NULL AS license_number, NULL AS specialized_info
                        FROM user_auth WHERE role = :role;
                END IF;
                :out_cursor := c_staff;
             END;`,
                    {
                        role: role,
                        out_cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
                    },
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );

                const cursor = result.outBinds.out_cursor;
                const rows = [];
                let row;
                while ((row = await cursor.getRow())) {
                    rows.push({
                        USER_ID: row.USER_ID,
                        STAFF_ID: row.STAFF_ID,
                        FULL_NAME: row.FULL_NAME,
                        EMAIL: row.EMAIL,
                        ROLE: row.ROLE,
                        IS_ACTIVE: row.IS_ACTIVE,
                        LICENSE_NUMBER: row.LICENSE_NUMBER,
                        // Map the specialized info dynamically to the common fields AdminDashboard uses
                        SPECIALIST_AREA: role === 'doctor' ? row.SPECIALIZED_INFO : undefined,
                        ALLOCATED_WARD: role === 'nurse' ? row.SPECIALIZED_INFO : undefined
                    });
                }
                await cursor.close();

                res.json({ staff: rows });
            } catch (error) {
                console.error('GET /api/admin/staff/:role failed', error);
                res.status(500).json({ error: 'Failed to fetch staff by role' });
            } finally {
                if (connection) {
                    try { await connection.close(); } catch (e) { /* ignore */ }
                }
            }
        });

        module.exports = router;
