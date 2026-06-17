const oracledb = require('oracledb');

// POST /api/pharmacy/dispense
async function dispense(req, res) {
  const { prescriptionId, drugId, dosage, duration, instructions } = req.body;

  if (!prescriptionId || !drugId || !dosage || !duration) {
    return res.status(400).json({ error: 'prescriptionId, drugId, dosage, and duration are required' });
  }

  let connection;
  try {
    connection = await oracledb.getConnection();

    // Check current stock levels
    const checkStockResult = await connection.execute(
      `SELECT QUANTITY, DRUG_NAME FROM DRUG_STOCK WHERE DRUG_ID = :drugId`,
      { drugId: Number(drugId) }
    );

    if (checkStockResult.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }

    const drug = checkStockResult.rows[0];
    const quantity = drug.QUANTITY !== undefined ? drug.QUANTITY : drug.quantity;
    const drugName = drug.DRUG_NAME !== undefined ? drug.DRUG_NAME : drug.drugName;

    if (quantity <= 0) {
      return res.status(400).json({ error: `Drug ${drugName || drugId} is out of stock` });
    }

    // Insert the prescription item — TRG_DRUG_STOCK_DECREMENT fires
    // automatically to decrement DRUG_STOCK.QUANTITY by 1
    await connection.execute(
      `INSERT INTO PRESCRIPTION_ITEM (PRESCRIPTION_ID, DRUG_ID, DOSAGE, DURATION, INSTRUCTIONS)
       VALUES (:prescriptionId, :drugId, :dosage, :duration, :instructions)`,
      {
        prescriptionId: Number(prescriptionId),
        drugId: Number(drugId),
        dosage,
        duration,
        instructions: instructions || null
      }
    );

    await connection.commit();
    res.status(200).json({ message: 'Prescription item dispensed successfully' });
  } catch (error) {
    console.error('Dispense transaction failed:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
    res.status(500).json({ error: 'Failed to dispense prescription: ' + error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Failed to close connection:', closeErr);
      }
    }
  }
}

// GET /api/pharmacy/low-stock
async function getLowStock(req, res) {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT DRUG_ID AS "drugId",
              DRUG_CODE AS "drugCode",
              DRUG_NAME AS "drugName",
              QUANTITY AS "quantity",
              CAPACITY AS "maxStock"
       FROM DRUG_STOCK
       WHERE QUANTITY < 15
       ORDER BY QUANTITY ASC`
    );
    res.json({ success: true, drugs: result.rows });
  } catch (error) {
    console.error('GET /api/pharmacy/low-stock failed:', error);
    res.status(500).json({ error: 'Failed to fetch low-stock drugs' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { }
    }
  }
}

// GET /api/pharmacy/prescriptions
async function getPrescriptions(req, res) {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT p.PRESCRIPTION_ID AS "prescriptionId",
              p.RECORD_ID AS "recordId",
              p.PATIENT_ID AS "patientId",
              pat.NAME AS "patientName",
              p.DOCTOR_ID AS "doctorId",
              doc.NAME AS "doctorName",
              TO_CHAR(p.PRESCRIBED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS "prescribedDate",
              p.NOTES AS "notes",
              pi.ITEM_ID AS "itemId",
              pi.DRUG_ID AS "drugId",
              ds.DRUG_NAME AS "drugName",
              ds.DRUG_CODE AS "drugCode",
              pi.DOSAGE AS "dosage",
              pi.DURATION AS "duration",
              pi.INSTRUCTIONS AS "instructions",
              ds.QUANTITY AS "drugStockQuantity"
       FROM PRESCRIPTION p
       LEFT JOIN PRESCRIPTION_ITEM pi ON p.PRESCRIPTION_ID = pi.PRESCRIPTION_ID
       LEFT JOIN PATIENTS pat ON p.PATIENT_ID = pat.PATIENT_ID
       LEFT JOIN DOCTOR doc ON p.DOCTOR_ID = doc.DOCTOR_ID
       LEFT JOIN DRUG_STOCK ds ON pi.DRUG_ID = ds.DRUG_ID
       ORDER BY p.PRESCRIPTION_ID DESC`
    );

    const prescriptionsMap = {};
    result.rows.forEach(row => {
      const presId = row.prescriptionId;
      if (!prescriptionsMap[presId]) {
        prescriptionsMap[presId] = {
          prescriptionId: presId,
          recordId: row.recordId,
          patientId: row.patientId,
          patientName: row.patientName,
          doctorId: row.doctorId,
          doctorName: row.doctorName,
          prescribedDate: row.prescribedDate,
          notes: row.notes,
          items: []
        };
      }

      if (row.itemId) {
        prescriptionsMap[presId].items.push({
          itemId: row.itemId,
          drugId: row.drugId,
          drugName: row.drugName,
          drugCode: row.drugCode,
          dosage: row.dosage,
          duration: row.duration,
          instructions: row.instructions,
          drugStockQuantity: row.drugStockQuantity
        });
      }
    });

    const prescriptions = Object.values(prescriptionsMap);
    res.json({ success: true, prescriptions });
  } catch (error) {
    console.error('GET /api/pharmacy/prescriptions failed:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { }
    }
  }
}

// GET /api/pharmacy/drugs
async function getDrugs(req, res) {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT DRUG_ID, DRUG_CODE, DRUG_NAME, QUANTITY, PRICE, CAPACITY, EXPIRE_DATE, BATCH_NUMBER FROM DRUG_STOCK`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, drugs: result.rows });
  } catch (error) {
    console.error('GET /api/pharmacy/drugs failed:', error);
    res.status(500).json({ error: 'Failed to fetch drugs inventory' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { }
    }
  }
}

// POST /api/pharmacy/add-drug
async function addDrug(req, res) {
  const { drugCode, drugName, initialQuantity, maxStock, price, manufactureDate, expireDate, batchNumber } = req.body;

  if (!drugCode || !drugName || initialQuantity === undefined || !maxStock || price === undefined || !manufactureDate || !expireDate || !batchNumber) {
    return res.status(400).json({ error: 'drugCode, drugName, initialQuantity, maxStock, price, manufactureDate, expireDate, and batchNumber are required' });
  }

  let connection;
  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `INSERT INTO DRUG_STOCK (DRUG_CODE, DRUG_NAME, QUANTITY, PRICE, CAPACITY, MANUFACTURE_DATE, EXPIRE_DATE, BATCH_NUMBER)
       VALUES (:drugCode, :drugName, :quantity, :price, :capacity, TO_DATE(:manufactureDate, 'YYYY-MM-DD'), TO_DATE(:expireDate, 'YYYY-MM-DD'), :batchNumber)
       RETURNING DRUG_ID INTO :drugId`,
      {
        drugCode,
        drugName,
        quantity: Number(initialQuantity),
        price: Number(price),
        capacity: Number(maxStock),
        manufactureDate,
        expireDate,
        batchNumber,
        drugId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    await connection.commit();
    const newDrugId = result.outBinds.drugId[0];
    res.status(201).json({ success: true, message: 'Drug added to inventory successfully', drugId: newDrugId });
  } catch (error) {
    console.error('POST /api/pharmacy/add-drug failed:', error); // Log exact SQL issue
    if (connection) {
      try { await connection.rollback(); } catch (e) { }
    }
    res.status(500).json({ error: 'Database error adding drug: ' + error.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { }
    }
  }
}

// POST /api/pharmacy/deduct-stock
async function deductStock(req, res) {
  const { drugId, quantity } = req.body;

  if (!drugId || quantity === undefined) {
    return res.status(400).json({ error: 'drugId and quantity are required' });
  }

  let connection;
  try {
    connection = await oracledb.getConnection();
    const updateResult = await connection.execute(
      `UPDATE DRUG_STOCK
       SET QUANTITY = QUANTITY - :qty
       WHERE DRUG_ID = :drugId AND QUANTITY >= :qty`,
      {
        qty: Number(quantity),
        drugId: Number(drugId)
      }
    );

    if (updateResult.rowsAffected === 0) {
      return res.status(400).json({ error: 'Failed to update stock. Out of stock or invalid drug ID.' });
    }

    await connection.commit();
    res.status(200).json({ success: true, message: 'Stock decremented successfully' });
  } catch (error) {
    console.error('POST /api/pharmacy/deduct-stock failed:', error);
    if (connection) {
      try { await connection.rollback(); } catch (e) { }
    }
    res.status(500).json({ error: 'Database error decrementing stock: ' + error.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { }
    }
  }
}

// DELETE /api/pharmacy/delete-drug/:id
async function deleteDrug(req, res) {
  const drugId = req.params.id;

  if (!drugId) {
    return res.status(400).json({ error: 'drugId is required' });
  }

  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `DELETE FROM DRUG_STOCK WHERE DRUG_ID = :drugId`,
      { drugId: Number(drugId) }
    );

    await connection.commit();
    res.status(200).json({ success: true, message: 'Drug deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/pharmacy/delete-drug failed:', error);
    if (connection) {
      try { await connection.rollback(); } catch (e) { }
    }
    res.status(500).json({ error: 'Database error deleting drug: ' + error.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { }
    }
  }
}

module.exports = {
  dispense,
  getLowStock,
  getPrescriptions,
  getDrugs,
  addDrug,
  deductStock,
  deleteDrug
};
