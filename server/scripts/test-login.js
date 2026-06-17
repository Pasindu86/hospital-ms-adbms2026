const oracledb = require('oracledb')
const bcrypt = require('bcryptjs')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

async function testLogin() {
  const poolConfig = {
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_CONNECT_STRING,
  }
  if (WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN
  if (WALLET_PASSWORD) poolConfig.walletPassword = WALLET_PASSWORD

  await oracledb.createPool(poolConfig)
  const connection = await oracledb.getConnection()

  console.log('--- TEST LOGIN ---')
  const staffId = 'gotabaya@gmail.com'
  const password = '123456'

  try {
    const result = await connection.execute(
      `SELECT user_id, staff_id, full_name, email, password_hash, role, is_active
       FROM user_auth
       WHERE staff_id = :sid OR email = :eid`,
      { sid: staffId, eid: staffId }
    )

    console.log('Query result rows length:', result.rows.length)
    if (result.rows.length === 0) {
      console.log('FAILED: No user found with staff_id/email:', staffId)
      return
    }

    const user = result.rows[0]
    console.log('User object fetched:', user)

    // Check uppercase/lowercase keys
    console.log('IS_ACTIVE key value:', user.IS_ACTIVE, '(lowercase is_active:', user.is_active, ')')
    console.log('PASSWORD_HASH key value:', user.PASSWORD_HASH ? '[HAS VALUE]' : 'undefined', '(lowercase password_hash:', user.password_hash ? '[HAS VALUE]' : 'undefined', ')')

    const isActiveVal = user.IS_ACTIVE !== undefined ? user.IS_ACTIVE : user.is_active
    const passwordHashVal = user.PASSWORD_HASH || user.password_hash

    if (isActiveVal === undefined) {
      console.log('WARNING: is_active is undefined in user object!')
    }

    if (!isActiveVal) {
      console.log('FAILED: Account is deactivated.')
      return
    }

    if (!passwordHashVal) {
      console.log('FAILED: Password hash is undefined in user object.')
      return
    }

    const validPassword = await bcrypt.compare(password, passwordHashVal)
    console.log('Bcrypt comparison result:', validPassword)

    if (!validPassword) {
      console.log('FAILED: Password mismatch.')
      return
    }

    console.log('SUCCESS: Login verification passed!')
  } catch (error) {
    console.error('Error in test login:', error)
  } finally {
    await connection.close()
    await oracledb.getPool().close(0)
  }
}

testLogin().catch(console.error)
