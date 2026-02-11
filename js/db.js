const mysql = require('mysql2');

// Pool de conexões (Railway safe)
const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 59778,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Loga erros sem travar o container
pool.on('error', (err) => {
    console.error('❌ Erro no MySQL Pool:', err.message);
});

module.exports = pool;
