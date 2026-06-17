const express = require('express')
const jwt = require('jsonwebtoken')
const oracledb = require('oracledb')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'carepulse_dev_secret_change_in_prod'

// Auth Middleware
function authPharmacist(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
    }
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
        if (decoded.role !== 'pharmacist') {
            return res.status(403).json({ error: 'Access denied. Pharmacist role required.' })
        }
        req.user = decoded
        next()
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' })
    }
}

router.use(authPharmacist)

// GET /api/pharmacist/prescriptions/pending
router.get('/prescriptions/pending', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT 
                p.PRESCRIPTION_ID,
                p.RECORD_ID,
                p.PRESCRIBED_DATE,
                pat.NAME AS PATIENT_NAME,
                pat.PHONE_NUMBER,
                doc.NAME AS DOCTOR_NAME,
                pi.ITEM_ID,
                pi.DRUG_ID,
                ds.DRUG_NAME,
                ds.DRUG_CODE,
                pi.DOSAGE,
                pi.DURATION,
                pi.INSTRUCTIONS
             FROM PRESCRIPTION p
             JOIN PATIENT pat ON p.PATIENT_ID = pat.PATIENT_ID
             JOIN DOCTOR doc ON p.DOCTOR_ID = doc.DOCTOR_ID
             JOIN PRESCRIPTION_ITEM pi ON p.PRESCRIPTION_ID = pi.PRESCRIPTION_ID
             JOIN DRUG_STOCK ds ON pi.DRUG_ID = ds.DRUG_ID
             ORDER BY p.PRESCRIBED_DATE DESC`
        );

        // Group items by prescription
        const prescriptionsMap = new Map();
        
        for (const row of result.rows) {
            if (!prescriptionsMap.has(row.PRESCRIPTION_ID)) {
                prescriptionsMap.set(row.PRESCRIPTION_ID, {
                    PRESCRIPTION_ID: row.PRESCRIPTION_ID,
                    RECORD_ID: row.RECORD_ID,
                    PRESCRIBED_DATE: row.PRESCRIBED_DATE,
                    PATIENT_NAME: row.PATIENT_NAME,
                    PHONE_NUMBER: row.PHONE_NUMBER,
                    DOCTOR_NAME: row.DOCTOR_NAME,
                    ITEMS: []
                });
            }
            prescriptionsMap.get(row.PRESCRIPTION_ID).ITEMS.push({
                ITEM_ID: row.ITEM_ID,
                DRUG_ID: row.DRUG_ID,
                DRUG_NAME: row.DRUG_NAME,
                DRUG_CODE: row.DRUG_CODE,
                DOSAGE: row.DOSAGE,
                DURATION: row.DURATION,
                INSTRUCTIONS: row.INSTRUCTIONS
            });
        }

        res.json({ prescriptions: Array.from(prescriptionsMap.values()) });
    } catch (error) {
        console.error('GET /api/pharmacist/prescriptions/pending failed', error);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) try { await connection.close() } catch (e) { }
    }
});

// POST /api/pharmacist/prescriptions/dispense/:id
router.post('/prescriptions/dispense/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const prescriptionId = req.params.id;

        // In a full implementation, this would deduct from DRUG_STOCK
        // For now, we'll just return success.
        
        res.json({ message: 'Prescription dispensed successfully' });
    } catch (error) {
        console.error('POST /api/pharmacist/prescriptions/dispense failed', error);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) try { await connection.close() } catch (e) { }
    }
});

module.exports = router;
