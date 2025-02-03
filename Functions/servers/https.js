const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');
const basicAuth = require('basic-auth'); // Autenticación básica
const { Log, IPINT, sequelize } = require('../../Functions/db'); 
const { runWebSocketServer } = require('./wss.js'); 
const dealerRoutes = require('../../Proyect/dealer'); 
const webRoutes = require('../../Proyect/web'); 
const apiRoutes = require('../../Proyect/api'); 
const uploadRoutes = require('../../Proyect/files'); 


// Create an object to track failed attempts per IP/session
const failedAttempts = {};

const appauthenticate = (req, res, next) => {
    const credentials = basicAuth(req);
    const validUser = process.env.VELG_USER;
    const validPassword = process.env.VELG_PWD;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Initialize or increment failed attempts for this IP
    if (!failedAttempts[clientIp]) {
        failedAttempts[clientIp] = 0;
    }

    // Check if the IP has exceeded the maximum allowed attempts
    if (failedAttempts[clientIp] >= 3) {
        res.status(403).send('Access Denied: Too many failed attempts.'); // Block access
        console.warn(`[AUTH] IP ${clientIp} blocked due to too many failed authentication attempts.`);
        return;
    }

    // Authenticate credentials
    if (
        credentials &&
        credentials.name === validUser &&
        credentials.pass === validPassword
    ) {
        failedAttempts[clientIp] = 0; // Reset failed attempts on successful login
        return next();
    } else {
        failedAttempts[clientIp] += 1; // Increment failed attempts
        res.set('WWW-Authenticate', 'Basic realm="Restricted Area"');
        console.warn(
            `[AUTH] Failed login attempt ${failedAttempts[clientIp]} from IP: ${clientIp}`
        );
        res.status(401).send('Access Denied: Unauthorized');
    }
};


async function runHTTPService(isSSL, HOST, PORT, SSL_PORT) {
    
    const app = express();
    app.use(bodyParser.json({ limit: '500mb' }));
    app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
    app.use(express.json()); 
    app.use(express.urlencoded({ extended: true })); 
    app.use(cors()); 
    app.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', "default-src 'self' http: https: data: blob: ws: 'unsafe-inline' 'unsafe-eval';");
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        next();
    });

    app.use('/web/assets', express.static('Web/assets')); 
    app.use('/web', appauthenticate, webRoutes); 
    app.use('/api', appauthenticate, apiRoutes); 
    app.use('/upload', uploadRoutes); 
    app.use('/dealer', dealerRoutes); 

    app.use((req, res, next) => {
        if (!req.originalUrl.startsWith('/web') && !req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/dealer')) {
            res.redirect('/web/index');
        } else {
            next();
        }
    });

    if (isSSL) {
        
        if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
            try {
                const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
                const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');
                const credentials = { key: privateKey, cert: certificate };

                webservice = https.createServer(credentials, app).listen(SSL_PORT, HOST, async () => {
                    console.log(`[5ELG-SERVICE] HTTPS server running at https://${HOST}:${SSL_PORT}`);
                    console.log(`[5ELG-DASHBOARD] Access 5ELG via ==> https://${HOST}:${PORT}/web/index`);
                    
                    try {
                        await sequelize.authenticate(); // Verificar conexión con la base de datos
                        console.log('[5ELG-DB] Database connected successfully.');
                    } catch (err) {
                        console.error('[5ELG-DB] Database connection failed:', err);
                    }
                });
            } catch (err) {
                console.error('[5ELG] Failed to load SSL certificates:', err);
                process.exit(1); // Salir si no se pueden cargar los certificados
            }
        } else {
            console.error('[5ELG] SSL_KEY_PATH and SSL_CERT_PATH must be set in the .env file for HTTPS.');
            process.exit(1); // Salir si las rutas de los certificados no están configuradas
        }
    } else {
        // Iniciar servidor HTTP
        webservice = http.createServer(app).listen(PORT, HOST, async () => {
            console.log(`[5ELG-SERVICE] HTTP server running at http://${HOST}:${PORT}`);
            console.log(`[5ELG-DASHBOARD] Access 5ELG via ==> http://${HOST}:${PORT}/web/index`);

            try {
                await sequelize.authenticate(); // Verificar conexión con la base de datos
                console.log('[5ELG-DB] Database connected successfully.');
                return;
            } catch (err) {
                console.error('[5ELG-DB] Database connection failed:', err);
            }
        });
    }
    runWebSocketServer(webservice);
}

module.exports = { runHTTPService }