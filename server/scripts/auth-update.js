const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

async function alterTable() {
  const poolConfig = {
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_CONNECT_STRING,
  }
  if (WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN
  if (WALLET_PASSWORD) poolConfig.walletPassword = WALLET_PASSWORD

  await oracledb.createPool(poolConfig)
  const connection = await oracledb.getConnection()

  try {
    await connection.execute(`ALTER TABLE user_auth DROP CONSTRAINT chk_role`)
    console.log('Dropped old constraint')
  } catch (e) {
    console.log('Drop constraint error:', e.message)
  }

  try {
    await connection.execute(`ALTER TABLE user_auth ADD CONSTRAINT chk_role CHECK (role IN ('admin','doctor','nurse','reception','pharmacist','patient'))`)
    console.log('Added new constraint allowing patient')
  } catch (e) {
    console.error('Add constraint error:', e.message)
  }

  await connection.close()
  await oracledb.getPool().close(0)
}

alterTable().catch(console.error)
