const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { DB_USER, DB_PASSWORD, DB_CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD } = process.env

if (WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', WALLET_DIR)
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

async function runBlock(connection, sql, label) {
  try {
    await connection.execute(sql)
    console.log('OK:', label)
  } catch (e) {
    if (e.errorNum === 1430 || e.errorNum === 2275 || e.errorNum === 2261 || e.errorNum === 955) {
      console.log('Skip (already exists):', label)
      return
    }
    throw e
  }
}

async function setup() {
  const poolConfig = { user: DB_USER, password: DB_PASSWORD, connectString: DB_CONNECT_STRING }
  if (WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN
  if (WALLET_PASSWORD) poolConfig.walletPassword = WALLET_PASSWORD

  await oracledb.createPool(poolConfig)
  const connection = await oracledb.getConnection()

  await runBlock(connection, `
    BEGIN
      EXECUTE IMMEDIATE 'ALTER TABLE patients ADD (user_id NUMBER)';
    EXCEPTION WHEN OTHERS THEN
      IF SQLCODE != -1430 THEN RAISE; END IF;
    END;`, 'Add user_id column')

  await runBlock(connection, `
    BEGIN
      EXECUTE IMMEDIATE 'ALTER TABLE patients ADD CONSTRAINT fk_patients_user
        FOREIGN KEY (user_id) REFERENCES user_auth(user_id) ON DELETE CASCADE';
    EXCEPTION WHEN OTHERS THEN
      IF SQLCODE NOT IN (-2275, -2261) THEN RAISE; END IF;
    END;`, 'Add fk_patients_user')

  const pkgPath = path.join(__dirname, '..', '..', 'database', 'patient_portal_plsql.sql')
  const fullSql = fs.readFileSync(pkgPath, 'utf8')

  const packageStart = fullSql.indexOf('CREATE OR REPLACE PACKAGE pkg_patient_portal AS')
  const packageBodyStart = fullSql.indexOf('CREATE OR REPLACE PACKAGE BODY pkg_patient_portal AS')
  const packageSpec = fullSql.slice(packageStart, packageBodyStart).trim()
  const packageBody = fullSql.slice(packageBodyStart).replace(/;\s*$/, '').trim()

  await connection.execute(packageSpec)
  console.log('OK: Package spec')

  await connection.execute(packageBody)
  console.log('OK: Package body')

  await connection.commit()
  console.log('\nPatient portal database setup complete.')
  await connection.close()
  await oracledb.getPool().close(0)
}

setup().catch((err) => {
  console.error('Setup failed:', err.message)
  process.exit(1)
})
