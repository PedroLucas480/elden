const mysql = require('mysql2');

// Configuração da conexão baseada na sua imagem do banco 'elden-ring'
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'elden-ring' 
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