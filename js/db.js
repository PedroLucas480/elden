const mysql = require('mysql2');

// O Pool evita que a conexão caia e gera o erro 500
const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verifica se a conexão está ativa nos logs do Railway
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ ERRO AO CONECTAR NO BANCO:", err.message);
    } else {
        console.log("✅ Conexão com o MySQL do Railway estabelecida!");
        connection.release();
    }
});

module.exports = pool;