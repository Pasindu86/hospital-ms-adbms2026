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

    // Add TOKEN_NUMBER column
    console.log('Adding TOKEN_NUMBER column...')
    try {
      await connection.execute(`
        ALTER TABLE PATIENT_DOCTOR_APPOINTMENT ADD (
          TOKEN_NUMBER NUMBER
        )
      `)
      console.log('Added TOKEN_NUMBER column.')
    } catch (e) {
      if (e.message.includes('ORA-01430') || e.errorNum === 1430) {
        console.log('TOKEN_NUMBER column already exists.')
      } else {
        console.warn('Error adding TOKEN_NUMBER column:', e.message)
      }
    }

    // Add Trigger TRG_APPOINTMENT_TOKEN
    console.log('Adding TRG_APPOINTMENT_TOKEN trigger...')
    try {
      await connection.execute(`
        CREATE OR REPLACE TRIGGER TRG_APPOINTMENT_TOKEN
        BEFORE INSERT ON PATIENT_DOCTOR_APPOINTMENT
        FOR EACH ROW
        DECLARE
            v_max_token NUMBER;
        BEGIN
            SELECT NVL(MAX(TOKEN_NUMBER), 0) INTO v_max_token
            FROM PATIENT_DOCTOR_APPOINTMENT
            WHERE DOCTOR_ID = :NEW.DOCTOR_ID
              AND TRUNC(APPOINTMENT_DATE) = TRUNC(:NEW.APPOINTMENT_DATE);
            
            :NEW.TOKEN_NUMBER := v_max_token + 1;
        END;
      `)
      console.log('Added TRG_APPOINTMENT_TOKEN trigger.')
    } catch (e) {
      console.warn('Error adding TRG_APPOINTMENT_TOKEN trigger:', e.message)
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
