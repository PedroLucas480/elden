const mysql = require('mysql2');

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

// Isso ajuda a ver o erro real no Log se a conexão falhar
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ ERRO DE CONEXÃO NO RAILWAY:", err.code);
    } else {
        console.log("✅ Conectado ao MySQL do Railway!");
        connection.release();
    }
});

module.exports = pool;