const mysql = require('mysql2');

// Criamos um POOL em vez de Connection para evitar o erro 500 no Railway
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

// Teste de conexão para o log do Railway
pool.getConnection((err, conn) => {
    if (err) {
        console.error('❌ ERRO CRÍTICO NO BANCO:', err.message);
    } else {
        console.log('✅ Conectado ao MySQL do Railway com sucesso!');
        conn.release();
    }
});

// Exportamos o pool (o seu serve.js vai funcionar igual)
module.exports = pool;