const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })
const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env
if (WALLET_DIR) process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)

async function run() {
    const poolConfig = { user: DB_USER, password: DB_PASSWORD, connectString: DB_CONNECT_STRING }
    if (WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN
    if (WALLET_PASSWORD) poolConfig.walletPassword = WALLET_PASSWORD
    await oracledb.createPool(poolConfig)
    const connection = await oracledb.getConnection()

    try {
        const staffId = '2' // lakshan staff id

        // Step 1: get USER_AUTH record
        const authRes = await connection.execute(
            `SELECT USER_ID, FULL_NAME, EMAIL, STAFF_ID FROM USER_AUTH WHERE STAFF_ID = :sid AND ROLE = 'nurse'`,
            { sid: staffId }
        )
        console.log("AuthRes:", authRes.rows)
        const authUser = authRes.rows[0]
        const userId = authUser[0] // user_id is first column in outFormat Array

        // Step 2: Match NURSE record by NURSE_ID = USER_ID
        console.log("UserID:", userId)
        let nurseRes = await connection.execute(
            `SELECT NURSE_ID, NAME, EMAIL, ADDRESS, PHONE_NUMBER, LICENSE_NUMBER, ALLOCATED_WARD
         FROM NURSE WHERE NURSE_ID = :uid`,
            { uid: userId }
        )
        console.log("NurseRes 1:", nurseRes.rows)

    } catch (error) {
        console.log('QUERY ERROR:', error.message);
    } finally {
        await connection.close()
        await oracledb.getPool().close(0)
    }
}

run()
