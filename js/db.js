const mysql = require('mysql2');

// Configuração original adaptada para Railway e Local
const connection = mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '', 
    database: process.env.MYSQLDATABASE || 'elden-ring',
    port: process.env.MYSQLPORT || 3306
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao MySQL:', err.message);
        return;
    }
    console.log('✅ Conectado ao banco elden-ring com sucesso!');
});

// Exporta a conexão para ser usada no server.js
module.exports = connection;