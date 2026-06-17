const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

(async () => {
    try {
        process.env.TNS_ADMIN = path.resolve(__dirname, process.env.WALLET_DIR);
        const c = await oracledb.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECT_STRING
        });
        const r = await c.execute(`SELECT table_name FROM user_tables`);
        console.log("Tables:");
        r.rows.forEach(row => console.log(row[0]));
        await c.close();
    } catch (e) {
        console.error("DB Error:", e);
    }
})();
