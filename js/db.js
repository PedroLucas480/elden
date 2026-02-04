const mysql = require('mysql2');

// Usamos createPool para o Railway gerenciar as conexões automaticamente
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

// Verifica se o banco está respondendo
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ ERRO CRÍTICO NO BANCO:', err.message);
    } else {
        console.log('✅ Banco de dados conectado com sucesso no Railway!');
        connection.release();
    }
});

module.exports = pool;