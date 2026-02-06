const pool = require('./js/db'); // Importa o arquivo que você postou

app.get('/api/builds', (req, res) => {
    pool.query('SELECT * FROM builds', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results); // Aqui os dados saem do banco para o site
    });
});