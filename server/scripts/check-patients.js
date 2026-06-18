const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })
if (process.env.WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', process.env.WALLET_DIR)
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

async function main() {
  const poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
  }
  if (process.env.WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN

  await oracledb.createPool(poolConfig)
  const c = await oracledb.getConnection()

  const patients = await c.execute(
    `SELECT patient_id, name, email, user_id FROM patients ORDER BY patient_id DESC FETCH FIRST 20 ROWS ONLY`
  )
  console.log('PATIENTS:', JSON.stringify(patients.rows, null, 2))

  const auth = await c.execute(
    `SELECT user_id, staff_id, full_name, email, role FROM user_auth
     WHERE LOWER(email) LIKE '%rishi%' OR LOWER(full_name) LIKE '%rishi%'`
  )
  console.log('USER_AUTH (rishi):', JSON.stringify(auth.rows, null, 2))

  await c.close()
  await oracledb.getPool().close(0)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
