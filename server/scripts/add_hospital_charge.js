require('dotenv').config({ path: '../.env.local' });
const oracledb = require('oracledb');
const path = require('path');

async function run() {
    let connection;
    try {
        const walletDir = process.env.WALLET_DIR ? path.resolve(__dirname, '..', process.env.WALLET_DIR) : null;
        if (walletDir) {
            process.env.TNS_ADMIN = walletDir;
        }
        if (process.env.ORACLE_CLIENT_DIR) {
            oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_DIR });
        }

        connection = await oracledb.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECT_STRING,
            walletLocation: walletDir,
            walletPassword: process.env.WALLET_PASSWORD,
        });

        console.log('Connected to DB. Running setup...');

        const statements = [
            `BEGIN
         EXECUTE IMMEDIATE 'ALTER TABLE "ADMIN"."DOCTOR" ADD ("HOSPITAL_CHARGE" NUMBER DEFAULT 500)';
       EXCEPTION
         WHEN OTHERS THEN
           IF SQLCODE != -1430 THEN RAISE; END IF;
       END;`
        ];

        for (let stmt of statements) {
            console.log('Executing:\\n', stmt.substring(0, 50) + '...');
            await connection.execute(stmt);
            console.log('Done.');
        }

        console.log('Setup finished successfully!');
    } catch (err) {
        console.error('Error setup DB:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

run();
