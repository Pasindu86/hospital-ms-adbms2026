/**
 * Set doctor working hours (15-min slots generated from this range).
 *
 * Usage:
 *   node scripts/set-doctor-hours.js --name "Gamage" --start 16:00 --end 21:00 --days 1,2,3,4,5,6,7
 *   node scripts/set-doctor-hours.js --doctorId 44 --start 09:00 --end 17:00 --days 1,2,3,4,5
 *
 * Days: 1=Monday ... 7=Sunday
 */
const oracledb = require('oracledb')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })
if (process.env.WALLET_DIR) {
  process.env.TNS_ADMIN = path.resolve(__dirname, '..', process.env.WALLET_DIR)
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { days: '1,2,3,4,5' }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name') opts.name = args[++i]
    else if (args[i] === '--doctorId') opts.doctorId = parseInt(args[++i], 10)
    else if (args[i] === '--start') opts.start = args[++i]
    else if (args[i] === '--end') opts.end = args[++i]
    else if (args[i] === '--days') opts.days = args[++i]
  }
  return opts
}

async function main() {
  const opts = parseArgs()
  if ((!opts.name && !opts.doctorId) || !opts.start || !opts.end) {
    console.error('Usage: node scripts/set-doctor-hours.js --name "Gamage" --start 16:00 --end 21:00 --days 1,2,3,4,5,6,7')
    process.exit(1)
  }

  const poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
  }
  if (process.env.WALLET_DIR) poolConfig.walletLocation = process.env.TNS_ADMIN

  await oracledb.createPool(poolConfig)
  const connection = await oracledb.getConnection()

  let doctorId = opts.doctorId
  if (!doctorId) {
    const res = await connection.execute(
      `SELECT doctor_id, name FROM doctor WHERE LOWER(name) LIKE '%' || LOWER(:name) || '%'`,
      { name: opts.name }
    )
    if (res.rows.length === 0) {
      console.error('Doctor not found:', opts.name)
      process.exit(1)
    }
    doctorId = res.rows[0].DOCTOR_ID
    console.log(`Found doctor: ${res.rows[0].NAME} (ID ${doctorId})`)
  }

  const days = opts.days.split(',').map((d) => parseInt(d.trim(), 10))

  await connection.execute(
    `DELETE FROM doctor_availability WHERE doctor_id = :doctorId AND day_of_week IN (${days.join(',')})`,
    { doctorId }
  )

  for (const day of days) {
    await connection.execute(
      `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
       VALUES (:doctorId, :day, :startTime, :endTime)`,
      { doctorId, day, startTime: opts.start, endTime: opts.end }
    )
  }

  await connection.commit()
  console.log(`Set hours ${opts.start}-${opts.end} on days [${days.join(',')}] for doctor ${doctorId}`)
  await connection.close()
  await oracledb.getPool().close(0)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
