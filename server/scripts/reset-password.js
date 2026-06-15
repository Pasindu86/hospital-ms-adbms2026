const oracledb = require('oracledb')
const bcrypt = require('bcryptjs')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

async function resetPassword() {
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
    const newPassword = '123456'
    const newHash = await bcrypt.hash(newPassword, 10)

    console.log(`Hashing new password: "${newPassword}" -> ${newHash}`)

    await connection.execute(
      `UPDATE user_auth SET password_hash = :newHash WHERE email = 'gotabaya@gmail.com'`,
      { newHash },
      { autoCommit: true }
    )

    console.log('Successfully updated password for gotabaya@gmail.com to "123456".')
  } catch (error) {
    console.error('Error updating password:', error.message)
  } finally {
    await connection.close()
    await oracledb.getPool().close(0)
  }
}

resetPassword().catch(console.error)
