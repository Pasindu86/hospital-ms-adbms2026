/**
 * Link an existing PATIENTS row to USER_AUTH so they can use patient portal login.
 *
 * Usage:
 *   node scripts/link-patient-to-auth.js rishi@gmail.com 12341234
 */
const bcrypt = require('bcryptjs')
const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('Usage: node scripts/link-patient-to-auth.js <email> <password>')
    process.exit(1)
  }

  const poolConfig = { user: DB_USER, password: DB_PASSWORD, connectString: DB_CONNECT_STRING }
  if (WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN
  if (WALLET_PASSWORD) poolConfig.walletPassword = WALLET_PASSWORD

  await oracledb.createPool(poolConfig)
  const connection = await oracledb.getConnection()

  try {
    const patientRes = await connection.execute(
      `SELECT patient_id, name, email, user_id FROM patients WHERE LOWER(email) = LOWER(:email)`,
      { email }
    )

    if (patientRes.rows.length === 0) {
      console.error(`No patient found in PATIENTS table with email: ${email}`)
      console.error('Add the patient via Reception first, or use /patient/register on the website.')
      process.exit(1)
    }

    const patient = patientRes.rows[0]

    if (patient.USER_ID) {
      const authRes = await connection.execute(
        `SELECT user_id, staff_id, role FROM user_auth WHERE user_id = :uid AND role = 'patient'`,
        { uid: patient.USER_ID }
      )
      if (authRes.rows.length > 0) {
        const hash = await bcrypt.hash(password, 10)
        await connection.execute(
          `UPDATE user_auth SET password_hash = :hash WHERE user_id = :uid`,
          { hash, uid: patient.USER_ID },
          { autoCommit: true }
        )
        console.log(`Patient already linked. Password updated for ${email}`)
        console.log(`Login with email: ${email} and your new password.`)
        return
      }
    }

    const existingAuth = await connection.execute(
      `SELECT user_id, role FROM user_auth WHERE LOWER(email) = LOWER(:email)`,
      { email }
    )

    if (existingAuth.rows.length > 0) {
      const auth = existingAuth.rows[0]
      if (auth.ROLE !== 'patient') {
        console.error(`Email ${email} exists in USER_AUTH as role "${auth.ROLE}" (staff account).`)
        console.error('Use a different email for patient portal, or login via Staff Portal.')
        process.exit(1)
      }
      await connection.execute(
        `UPDATE patients SET user_id = :uid WHERE patient_id = :pid`,
        { uid: auth.USER_ID, pid: patient.PATIENT_ID },
        { autoCommit: true }
      )
      const hash = await bcrypt.hash(password, 10)
      await connection.execute(
        `UPDATE user_auth SET password_hash = :hash WHERE user_id = :uid`,
        { hash, uid: auth.USER_ID },
        { autoCommit: true }
      )
      console.log(`Linked existing patient auth for ${email}`)
      return
    }

    const maxIdRes = await connection.execute(
      `SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(staff_id, '[^0-9]', ''))), 0) + 1 AS next_id
       FROM user_auth WHERE role = 'patient'`
    )
    const nextId = maxIdRes.rows[0].NEXT_ID || 1
    const staffId = 'P' + String(nextId).padStart(3, '0')
    const hash = await bcrypt.hash(password, 10)

    const insertRes = await connection.execute(
      `INSERT INTO user_auth (staff_id, full_name, email, password_hash, role, is_active)
       VALUES (:staffId, :name, :email, :hash, 'patient', 1)
       RETURNING user_id INTO :userId`,
      {
        staffId,
        name: patient.NAME,
        email: patient.EMAIL,
        hash,
        userId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    )

    const userId = insertRes.outBinds.userId[0]

    await connection.execute(
      `UPDATE patients SET user_id = :uid WHERE patient_id = :pid`,
      { uid: userId, pid: patient.PATIENT_ID },
      { autoCommit: true }
    )

    console.log('Success! Patient portal login enabled:')
    console.log(`  Email:    ${email}`)
    console.log(`  Password: (the one you provided)`)
    console.log(`  Patient ID: ${patient.PATIENT_ID}`)
    console.log(`  Staff/Patient login ID: ${staffId}`)
    console.log('\nLogin at: http://localhost:5173/patient/login')
  } finally {
    await connection.close()
    await oracledb.getPool().close(0)
  }
}

main().catch((err) => {
  console.error('Failed:', err.message)
  if (err.message?.includes('user_id')) {
    console.error('\nRun database/patient_portal_plsql.sql first to add the user_id column.')
  }
  process.exit(1)
})
