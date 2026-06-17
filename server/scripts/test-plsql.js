const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

async function testPLSQL() {
  const poolConfig = {
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_CONNECT_STRING,
  }
  if (WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN
  if (WALLET_PASSWORD) poolConfig.walletPassword = WALLET_PASSWORD

  await oracledb.createPool(poolConfig)
  const connection = await oracledb.getConnection()

  console.log('Connected to database.')

  const testPatient = {
    name: 'PLSQL Test Patient',
    email: 'plsql.test@carepulse.local',
    phoneNumber: '+94 77 000 0000',
    address: '456 Test Lane, DB land',
    disease: 'PLSQL Testing',
    dobDate: new Date('1995-10-10'),
    gender: 'Other'
  }

  try {
    console.log('Calling save_patient PL/SQL stored procedure...')
    const resultExecute = await connection.execute(
      `BEGIN
         save_patient(:patientId, :name, :email, :phoneNumber, :address, :disease, :dobDate, :gender);
       END;`,
      {
        patientId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        name: testPatient.name,
        email: testPatient.email,
        phoneNumber: testPatient.phoneNumber,
        address: testPatient.address,
        disease: testPatient.disease,
        dobDate: testPatient.dobDate,
        gender: testPatient.gender
      },
      { autoCommit: true }
    )
    const newId = resultExecute.outBinds.patientId
    console.log('Stored procedure executed successfully! Generated Patient ID:', newId)

    console.log('Querying patients table to verify insertion...')
    const result = await connection.execute(
      `SELECT patient_id, name, disease FROM patients WHERE patient_id = :id`,
      { id: newId }
    )
    console.log('Query Result:', result.rows)

    if (result.rows.length > 0 && result.rows[0].NAME === testPatient.name) {
      console.log('SUCCESS: Patient was successfully saved and fetched using PL/SQL!')
    } else {
      console.log('FAILURE: Patient was not saved or mismatch occurred.')
    }
  } catch (error) {
    console.error('Test failed with error:', error)
  } finally {
    await connection.close()
    await oracledb.getPool().close(0)
  }
}

testPLSQL()
