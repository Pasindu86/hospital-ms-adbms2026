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
        mobileNumber, address, licenseNumber, specialistArea, nurses
    } = req.body;

    if (role !== 'doctor') {
        return res.status(400).json({ error: 'Invalid role for this endpoint' });
    }

    if (!staffId || !fullName || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let connection;
    try {
        const hash = await bcrypt.hash(password, 10);
        connection = await oracledb.getConnection();
        
        const nurseIdsCsv = (nurses || []).join(',');

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
        mobileNumber, address, licenseNumber, allocatedWard
    } = req.body;

    if (role !== 'nurse') {
        return res.status(400).json({ error: 'Invalid role for this endpoint' });
    }

    if (!staffId || !fullName || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let connection;
    try {
        const hash = await bcrypt.hash(password, 10);
        connection = await oracledb.getConnection();
        
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

module.exports = router;
