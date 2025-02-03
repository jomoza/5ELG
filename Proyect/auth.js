require('dotenv').config();
const jwt = require('jsonwebtoken');

// Middleware para verificar tokens JWT
const authMiddleware = (req, res, next) => {
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = authHeader.split(' ')[1]; // Extraer el token después de "Bearer"

    try {
        // Verificar y decodificar el token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Guardar los datos decodificados en la solicitud para uso posterior
        return next(); // Continuar al siguiente middleware o ruta
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = {
    authMiddleware,
};

/*
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

// Ruta para iniciar sesión y generar un token JWT
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Verificar las credenciales (puedes reemplazar esto con lógica de base de datos)
    if (username === process.env.AUTH_USER && password === process.env.AUTH_PASS) {
        // Crear un payload con datos que quieras incluir en el token
        const payload = { username };

        // Firmar el token
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1h', // Tiempo de expiración del token
        });

        return res.json({ token });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
});

module.exports = router;

*/