const oracledb = require('oracledb')
const bcrypt = require('bcryptjs')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

async function checkPassword() {
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
      `SELECT email, password_hash, role FROM user_auth WHERE email = 'gotabaya@gmail.com'`
    )
    if (result.rows.length === 0) {
      console.log('User gotabaya@gmail.com not found!')
      return
    }

    const row = result.rows[0]
    // Since outFormat is default/array in this script, or object depending on configuration
    const email = row[0] || row.EMAIL
    const hash = row[1] || row.PASSWORD_HASH

    console.log('User found:', email)
    console.log('Password Hash:', hash)

    // Let's test a few common passwords
    const commonPasswords = ['123456', 'gotabaya123', 'gotabaya', 'password', 'password123']
    for (const pwd of commonPasswords) {
      const match = await bcrypt.compare(pwd, hash)
      console.log(`Testing password "${pwd}":`, match ? 'MATCH!' : 'NO MATCH')
    }
  } catch (error) {
    console.error('Error checking password:', error.message)
  } finally {
    await connection.close()
    await oracledb.getPool().close(0)
  }
}

checkPassword().catch(console.error)
