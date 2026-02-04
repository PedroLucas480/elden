const mysql = require('mysql2');

// Usamos createPool para evitar que a conexão caia no Railway
const connection = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD, 
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testando a conexão inicial
connection.getConnection((err, conn) => {
    if (err) {
        console.error('❌ Erro ao conectar ao MySQL no Railway:', err.message);
        return;
    }
    console.log('✅ Conectado ao banco do Railway com sucesso!');
    conn.release(); // Libera a conexão de volta para o pool
});

// Exporta o pool para ser usado no serve.js
module.exports = connection;