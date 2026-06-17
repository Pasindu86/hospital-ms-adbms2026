const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

async function run() {
  let connection
  try {
    const poolConfig = {
      user: DB_USER,
      password: DB_PASSWORD,
      connectString: DB_CONNECT_STRING,
    }
    if (WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN
    if (WALLET_PASSWORD) poolConfig.walletPassword = WALLET_PASSWORD

    await oracledb.createPool(poolConfig)
    connection = await oracledb.getConnection()

    console.log('Successfully connected to the database.')

    // Add PAYMENT_METHOD column
    console.log('Adding PAYMENT_METHOD column...')
    try {
      await connection.execute(`
        ALTER TABLE PATIENT_DOCTOR_APPOINTMENT ADD (
          PAYMENT_METHOD VARCHAR2(20) DEFAULT 'Cash'
        )
      `)
      console.log('Added PAYMENT_METHOD column.')
    } catch (e) {
      if (e.message.includes('ORA-01430') || e.errorNum === 1430) {
        console.log('PAYMENT_METHOD column already exists.')
      } else {
        console.warn('Error adding PAYMENT_METHOD column:', e.message)
      }
    }

    // Add PAYMENT_STATUS column
    console.log('Adding PAYMENT_STATUS column...')
    try {
      await connection.execute(`
        ALTER TABLE PATIENT_DOCTOR_APPOINTMENT ADD (
          PAYMENT_STATUS VARCHAR2(20) DEFAULT 'Pending'
        )
      `)
      console.log('Added PAYMENT_STATUS column.')
    } catch (e) {
      if (e.message.includes('ORA-01430') || e.errorNum === 1430) {
        console.log('PAYMENT_STATUS column already exists.')
      } else {
        console.warn('Error adding PAYMENT_STATUS column:', e.message)
      }
    }

    // Add check constraint for PAYMENT_METHOD
    console.log('Adding CHK_PAYMENT_METHOD constraint...')
    try {
      await connection.execute(`
        ALTER TABLE PATIENT_DOCTOR_APPOINTMENT ADD CONSTRAINT CHK_PAYMENT_METHOD 
        CHECK (PAYMENT_METHOD IN ('Cash', 'Online'))
      `)
      console.log('Added CHK_PAYMENT_METHOD check constraint.')
    } catch (e) {
      if (e.message.includes('ORA-02264') || e.errorNum === 2264) {
        console.log('CHK_PAYMENT_METHOD constraint already exists.')
      } else {
        console.warn('Error adding CHK_PAYMENT_METHOD constraint:', e.message)
      }
    }

    // Add check constraint for PAYMENT_STATUS
    console.log('Adding CHK_PAYMENT_STATUS constraint...')
    try {
      await connection.execute(`
        ALTER TABLE PATIENT_DOCTOR_APPOINTMENT ADD CONSTRAINT CHK_PAYMENT_STATUS 
        CHECK (PAYMENT_STATUS IN ('Pending', 'Paid'))
      `)
      console.log('Added CHK_PAYMENT_STATUS check constraint.')
    } catch (e) {
      if (e.message.includes('ORA-02264') || e.errorNum === 2264) {
        console.log('CHK_PAYMENT_STATUS constraint already exists.')
      } else {
        console.warn('Error adding CHK_PAYMENT_STATUS constraint:', e.message)
      }
    }

    console.log('Database schema update finished successfully.')
  } catch (error) {
    console.error('Database migration script failed:', error)
  } finally {
    if (connection) {
      await connection.close()
    }
    await oracledb.getPool().close(0)
  }
}

run()
