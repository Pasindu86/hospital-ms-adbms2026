const oracledb = require('oracledb');

async function initPool() {
    await oracledb.createPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING, // e.g. "yourdb_high"
        configDir: process.env.WALLET_DIR,             // path to wallet folder
        walletLocation: process.env.WALLET_DIR,
        walletPassword: process.env.WALLET_PASSWORD
    });
}