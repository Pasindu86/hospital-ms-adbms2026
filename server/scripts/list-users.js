const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

async function listUsers() {
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
    const result = await connection.execute(
      `SELECT user_id, staff_id, full_name, email, role, is_active FROM user_auth`
    )
    console.log('All Users in user_auth:')
    console.log(JSON.stringify(result.rows, null, 2))
  } catch (error) {
    console.error('Error fetching users:', error.message)
  } finally {
    await connection.close()
    await oracledb.getPool().close(0)
  }
}

listUsers().catch(console.error)
