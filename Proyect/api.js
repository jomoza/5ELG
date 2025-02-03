const express = require('express');
const router = express.Router();
const { Log, IPINT } = require('../Functions/db'); // Modelo Sequelize

const { runwhois, geolocateAndUpdate } = require('../Functions/scanners/ipinfo'); 
const { scanAndUpdateWithNmap } = require('../Functions/scanners/nmap'); 
const { updateSHODANIPData, updateCriminalIPData } = require('../Functions/scanners/shodan'); 

const { generateCSV, handleBackupLogs, clearLogs, getFingerprintRecordByID } = require('../Functions/utils'); // Funciones auxiliares
const sequelize = require('sequelize'); // Asegúrate de importar Sequelize correctamente
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const dotenv = require('dotenv');
dotenv.config();



// Configuración del almacenamiento de archivos con multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || 'uploads';
        const id = req.body.ID || 'default';
        const dir = path.join(uploadPath, id);

        // Crear la carpeta de subida si no existe
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir); // Ruta donde se almacenarán los archivos
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

// Configuración de multer
let upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // Limite de 10 MB por archivo
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|docx|zip|csv|application\/octet-stream/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        console.log(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('El archivo no es válido. Solo se permiten imágenes, PDF, texto, y ciertos documentos.'));
    },
});

const apiOptionsHandlers = {
    getENVVars: async (req, res) => {
        try {
            const envVars = process.env;
            res.status(200).json(envVars);
        } catch (err) {
            console.error('Error fetching environment variables:', err);
            res.status(500).json({ error: 'Error fetching environment variables', details: err.message });
        }
    },
    getENVVars: async (req, res) => {
        try {
            const envVars = process.env;
            res.status(200).json(envVars);
        } catch (err) {
            console.error('Error fetching environment variables:', err);
            res.status(500).json({ error: 'Error fetching environment variables', details: err.message });
        }
    },

    getDomains: async (req, res) => {
        try {
            const domains = getDomains();
            res.status(200).json(domains);
        } catch (error) {
            console.error('Error fetching domains:', error.message);
            res.status(500).json({ error: 'Error fetching domains', details: error.message });
        }
    },

    addDomain: async (req, res) => {
        const newDomain = req.body;
        if (!newDomain.name || !newDomain.ip || !newDomain.status) {
            return res.status(400).json({ error: 'Name, IP, and status are required' });
        }

        try {
            addDomain(newDomain);
            res.status(201).json({ message: 'Domain added successfully', domain: newDomain });
        } catch (error) {
            console.error('Error adding domain:', error.message);
            res.status(500).json({ error: 'Error adding domain', details: error.message });
        }
    },

    findDomainById: async (req, res) => {
        const domainId = parseInt(req.params.id, 10);

        try {
            const domain = findDomainById(domainId);
            if (!domain) {
                return res.status(404).json({ error: 'Domain not found' });
            }
            res.status(200).json(domain);
        } catch (error) {
            console.error('Error finding domain:', error.message);
            res.status(500).json({ error: 'Error finding domain', details: error.message });
        }
    },

    activateDomain: async (req, res) => {
        const domainId = parseInt(req.params.id, 10);

        try {
            const domain = findDomainById(domainId);
            if (!domain) {
                return res.status(404).json({ error: 'Domain not found' });
            }

            if (domain.status === 'active') {
                return res.status(400).json({ error: 'Domain is already active' });
            }

            activateDomain(domainId);
            res.status(200).json({ message: 'Domain activated successfully', domain: findDomainById(domainId) });
        } catch (error) {
            console.error('Error activating domain:', error.message);
            res.status(500).json({ error: 'Error activating domain', details: error.message });
        }
    },    
    getBackups: async (req, res) => {
        try {
            const backupsPath = process.env.BACKUP_PATH;
            if (!backupsPath) {
                throw new Error('BACKUP_PATH is not defined');
            }

            fs.readdir(backupsPath, (err, files) => {
                if (err) {
                    console.error('Error reading backups directory:', err);
                    return res.status(500).json({ error: 'Error reading backups directory', details: err.message });
                }

                const backups = files.map(file => {
                    const filePath = path.join(backupsPath, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        created: stats.birthtime,
                        size: stats.size
                    };
                });

                res.status(200).json(backups);
            });
        } catch (err) {
            console.error('Error fetching backups:', err);
            res.status(500).json({ error: 'Error fetching backups', details: err.message });
        }
    },
    getDealers: async (req, res) => {
        try {
            const dealersPath = process.env.DEALERS_PATH;
            fs.readdir(dealersPath, (err, files) => {
                if (err) {
                    console.error('Error reading dealers directory:', err);
                    return res.status(500).json({ error: 'Error reading dealers directory', details: err.message });
                }

                const dealers = files.map(file => {
                    const filePath = path.join(dealersPath, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        extension: path.extname(file),
                        type: stats.isFile() ? 'file' : 'directory',
                        size: stats.size
                    };
                });

                res.status(200).json(dealers);
            });
        } catch (err) {
            console.error('Error fetching dealers:', err);
            res.status(500).json({ error: 'Error fetching dealers', details: err.message });
        }
    },
    downloadDealer: async (req, res) => {
        try {
            const { filename } = req.params;
            const dealersPath = process.env.DEALERS_PATH;
            if (!dealersPath) {
                throw new Error('DEALERS_PATH is not defined');
            }
            const filePath = path.join(dealersPath, filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.download(filePath);
        } catch (err) {
            console.error('Error downloading dealer file:', err);
            res.status(500).json({ error: 'Error downloading dealer file', details: err.message });
        }
    }
}

// Controladores de la API
const apiHandlers = {

    generateCsvLogs: async (req, res) => {
        try {
            const csvFilePath = await handleBackupLogs();
            
            // Verifica si el archivo existe
            await fsp.access(csvFilePath);
            
            const csvDataOut = await fsp.readFile(csvFilePath, 'utf8');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=logs_backup.csv');
            
            res.send(csvDataOut);
        } catch (err) {
            console.error('Error generating CSV logs:', err);
            res.status(500).json({ error: 'Error generating CSV logs', details: err.message });
        }
    },

    clearLogs: async (req, res) => {
        const id = req.query.id || null;
        try {
            await clearLogs(id);
            if (id) {
                res.json({ message: `Log with ID ${id} cleared successfully.` });
            } else {
                res.json({ message: 'All logs cleared successfully.' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Error clearing logs', details: err });
        }
    },
    countDealers: async (req, res) => {
        try {
            const result = await Log.findAll({
                attributes: ['Dl', [sequelize.fn('COUNT', sequelize.col('Dl')), 'count']],
                group: ['Dl'],
            });            
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: 'Error counting dealers', err });
        }
    },
    uploadCSVDealerData: (req, res) => {
        const results = [];

        // Verificar si se ha subido un archivo
        if (!req.file) {
            return res.status(400).send('No se ha subido ningún archivo.');
        }

        // Leer el archivo CSV
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                // Extraer los campos necesarios
                const dealerData = {
                    fpRequest: data.FP_REQUEST,
                    encodedScr: data.SCREEN_ENCODED,
                    encodedPage: data.HTML_ENCODED,
                    jsData: data.JS_DATA,
                    encodedReq: Buffer.from(JSON.stringify(data.encoded_req)).toString('base64'),
                    rts: data.TS,
                    ip: data.IP,
                    userAgent: decodeURIComponent(data.UA),
                    fpUser: data.FP_USER,
                    fpBrowser: data.FP_BROWSER
                };

                results.push(dealerData);
            })
            .on('end', async () => {
                // Procesar los datos extraídos
                try {
                    for (const dealerData of results) {
                        processDealerData(dealerData);
                    }
                    res.status(200).json({ message: 'Datos procesados correctamente', data: results });
                } catch (err) {
                    console.error('[!] Error al guardar los datos en la base de datos:', err.message);
                    res.status(500).send('Error al guardar los datos en la base de datos.');
                } finally {
                    res.redirect('/web/upload');
                }
            })
            .on('error', (err) => {
                console.error('[!] Error al procesar el archivo CSV:', err.message);
                res.status(500).send('Error al procesar el archivo CSV.');
            });
    },
    csvClientInfo: async (req, res) => {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'ID is required' });
        }
        try {
            const csvData = await generateCSV({ id });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=client_${id}_info.csv`);
            res.send(csvData);
        } catch (err) {
            res.status(500).json({ error: 'Error generating client CSV', details: err });
        }
    },

    csvAllClients: async (req, res) => {
        try {
            const csvData = await generateCSV();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=all_clients.csv');
            res.send(csvData);
        } catch (err) {
            res.status(500).json({ error: 'Error generating CSV for all clients', details: err });
        }
    },

    getFileFromID: async (req, res) => {
        try {
            const { ID } = req.params;
            const uploadPath = process.env.UPLOAD_PATH || 'uploads';
            const dir = path.join(uploadPath, ID);

            if (!fs.existsSync(dir)) {
                return res.status(404).json({ message: 'No se encontró la carpeta con el ID proporcionado.' });
            }

            const files = fs.readdirSync(dir).map((file) => {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    creationTime: stats.birthtime,
                    modificationTime: stats.mtime,
                };
            });

            res.status(200).json({
                message: 'Archivos obtenidos con éxito.',
                files: files,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error al obtener los archivos.', error: err.message });
        }
    },
    getClientFInfo: async (req, res) => {
        const { fu } = req.query;
        if (!fu) {
            return res.status(400).json({ error: 'Fu is required' });
        }
        try {
            const logs = await Log.findAll({ where: { fu } });
            if (logs.length === 0) {
                return res.status(404).json({ error: 'No logs found for the given Fu' });
            }
            res.json(logs);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching logs for Fu', details: err });
        }
    },

    last7Logs: async (req, res) => {
        try {
            const logs = await Log.findAll({
                limit: 20,
                order: [['id', 'DESC']],
            });
            res.json(logs);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching last 7 logs', details: err });
        }
    },

    totalLogs: async (req, res) => {
        try {
            const totalLogs = await Log.count();
            res.json({ total_logs: totalLogs });
        } catch (err) {
            res.status(500).json({ error: 'Error counting total logs', details: err });
        }
    },

    logsByDealer: async (req, res) => {
        try {
            const result = await Log.findAll({
                attributes: ['Dl', [sequelize.fn('COUNT', sequelize.col('Dl')), 'count']],
                group: ['Dl'],
            });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching logs by dealer', details: err });
        }
    },

    logsByIP: async (req, res) => {
        try {
            const result = await Log.findAll({
                attributes: ['Ip', [sequelize.fn('COUNT', sequelize.col('Ip')), 'count']],
                group: ['Ip'],
            });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching logs by IP', details: err });
        }
    },
    upload: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No se subió ningún archivo.' });
            }
            res.status(200).json({
                message: 'Archivo subido con éxito.',
                file: {
                    originalname: req.file.originalname,
                    filename: req.file.filename,
                    path: req.file.path,
                    size: req.file.size,
                },
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error al subir el archivo.', error: err.message });
        }    
    },
    uploads: async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: 'No se subieron archivos.' });
            }
            const uploadedFiles = req.files.map((file) => ({
                originalname: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
            }));
            res.status(200).json({
                message: 'Archivos subidos con éxito.',
                files: uploadedFiles,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error al subir los archivos.', error: err.message });
        }    
    },
    getfiles: async (req, res) => {
        try {
            // Read directories inside the uploadPath
            const folders = fs.readdirSync(process.env.UPLOAD_PATH, { withFileTypes: true }).filter(dirent => dirent.isDirectory());
    
            const fileDetails = [];
    
            // Process each folder and list its files
            for (const folder of folders) {
                const folderPath = path.join(process.env.UPLOAD_PATH, folder.name);
                const files = fs.readdirSync(folderPath, { withFileTypes: true });
    
                // Process each file in the folder
                files.forEach((file) => {
                    if (file.isFile()) { // Ignore subdirectories
                        const filePath = path.join(folderPath, file.name);
                        const stats = fs.statSync(filePath); // Get file metadata
    
                        fileDetails.push({
                            name: file.name, // File name
                            type: path.extname(file.name) || 'unknown', // File extension
                            size: stats.size, // File size in bytes
                            lastModified: stats.mtime, // Last modified date
                            origin: folder.name, // The folder name as the origin
                        });
                    }
                });
            }
    
            // Send file details as JSON response
            res.status(200).json({ files: fileDetails });
        } catch (err) {
            console.error('Error while listing files:', err);
            res.status(500).json({ message: 'Error while listing files.', error: err.message });
        }        
    },
    getSingleFile: async (req, res) => {
        const uploadPath = process.env.UPLOAD_PATH || 'uploads';
        const filePath = path.join(uploadPath, req.params.filename);
    
        // Verificar si el archivo existe
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Archivo no encontrado.' });
        }
    
        res.download(filePath, req.params.filename, (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ message: 'Error al descargar el archivo.', error: err.message });
            }
        });
    },
    FingerByUserID: async (req, res) => {
        try {
            const { userId } = req.params;
            var result = await getFingerprintRecordByID(userId)
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching logs by user ID', details: err });
        }
    },
    FingerBrows: async (req, res) => {
        try {
            const result = await Log.findAll({
                attributes: ['Fb', [sequelize.fn('COUNT', sequelize.col('Fb')), 'count']],
                group: ['Fb'],
            });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching logs by day', details: err });
        }
    },
    fingersUsers: async (req, res) => {
        try {
            const result = await Log.findAll({
                attributes: ['Fu', [sequelize.fn('COUNT', sequelize.col('Fu')), 'count']],
                group: ['Fu'],
            });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching logs by day', details: err });
        }
    },
    logbyFU: async (req, res) => {
        try {
            const { userId } = req.params;
            const result = await Log.findAll({
                where: { Fu: userId },
            });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching logs', details: err });
        }
    },
    logbyIP: async (req, res) => {
        try {
            const { IPD } = req.params;            
            const result = await Log.findAll({
                where: { Ip: IPD },
            });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching logs', details: err });
        }
    },
};

const apiScannersHandlers = {
    runScanner: (req, res) => {
        try {
            const { IP } = req.body;
            if (!IP) {
                return res.status(400).json({ error: 'Missing IP in request body.' });
            }
    
            console.log(`[5ELG-SCANNER] Starting scans for IP: ${IP}`);
    
            // Ejecutar el escaneo Nmap
            const nmapResults = scanAndUpdateWithNmap(IP);
            
            console.log(nmapResults);
            
    
            return res.status(200   ).json({
                message: `Scanner tasks for IP: ${IP} completed successfully.`,
                data: nmapResults,
            });
        } catch (error) {
            console.error(`[5ELG-SCANNER] Error processing scanner tasks for IP:`, error);
            return res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    },
    runGeo: async (req, res) => {
        try {
            const { IP } = req.body;
    
            if (!IP) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No IP provided. Please provide an IP address in the request body.',
                });
            }
    
            console.log(`[5ELG-GEO] Starting geolocation and Whois scan for IP: ${IP}`);
    
            // Llamar a la función runwhois
            const updatedData = await runwhois(IP); // Esperar a que se complete
            await geolocateAndUpdate(IP); // Esperar a que se complete

    
            if (!updatedData) {
                return res.status(404).json({
                    status: 'error',
                    message: `No record found or updated for IP: ${IP}`,
                });
            }
    
            return res.status(200).json({
                status: 'success',
                message: `Geolocation and Whois scan completed for IP: ${IP}`,
                data: updatedData,
            });
        } catch (error) {
            console.error(`[5ELG-GEO] Error scanning IP: `, error);
            return res.status(500).json({
                status: 'error',
                message: `An error occurred while scanning the IP: ${error.message}`,
            });
        }
    },
    runOSINT: async (req, res) => {
        

        try {
            // Validar que se reciba la IP en el cuerpo de la solicitud
            const { IP } = req.body;
            if (!IP) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No IP provided. Please provide an IP address in the request body.'
                });
            }
    
            // Ejecutar las funciones necesarias para realizar OSINT en la IP
            console.log(`[OSINT-ANALYSIS] Starting OSINT analysis for IP: ${IP}`);
            
            await updateSHODANIPData(IP); // Actualización con datos de Shodan
            await updateCriminalIPData(IP); // Actualización con datos de CriminalIP
    
            
    
            // Responder con éxito
            return res.status(200).json({
                status: 'success',
                message: `OSINT analysis completed successfully for IP: ${IP}`
            });
    
        } catch (error) {
            // Manejo de errores
            console.error(`[OSINT-ANALYSIS] Error during OSINT analysis for IP: ${error.message}`);
            return res.status(500).json({
                status: 'error',
                message: `An error occurred while performing OSINT analysis for IP: ${error.message}`
            });
        }
    },
    // List all IP entries
    listsIPs: async (req, res) => {
        try {
            const ipList = await IPINT.findAll();
            res.status(200).json(ipList);
        } catch (error) {
            console.error('[5ELG-API] Error listing IPs:', error.message);
            res.status(500).json({ error: 'Error listing IPs' });
        }
    },

    // Get information about a specific IP
    infoIP: async (req, res) => {
        const { ID } = req.query;
        if (!ID) {
            return res.status(400).json({ error: 'Valid params are required' });
        }

        try {
            const ipInfo = await IPINT.findOne({ where: { ID } });
            if (!ipInfo) {
                return res.status(404).json({ error: 'IP not found' });
            }
            res.status(200).json(ipInfo);
        } catch (error) {
            console.error('[5ELG-API] Error fetching IP info:', error.message);
            res.status(500).json({ error: 'Error fetching IP info' });
        }
    },
    // Check if an IP exists, create it if it doesn't
    checkOrCreateIP: async (req, res) => {
        const { IP } = req.body; // IP address to check or create

        if (!IP) {
            return res.status(400).json({ error: 'IP is required.' });
        }

        try {
            // Find or create the IP entry
            const [ipEntry, created] = await IPINT.findOrCreate({
                where: { IP },
                defaults: {
                    MAC: null,
                    DATA: null,
                    GEO: null,
                    SCAN: false,
                    INTEL: null,
                },
            });
            await ipEntry.save();

            if (created) {
                console.log(`[5ELG-API] New IP created: ${IP}`);
            } else {
                console.log(`[5ELG-API] IP already exists: ${IP}`);
            }

            res.status(200).json({ message: created ? 'IP created successfully.' : 'IP already exists.', ipEntry });
        } catch (error) {
            console.error('[5ELG-API] Error checking or creating IP:', error.message);
            res.status(500).json({ error: 'Error checking or creating IP.' });
        }
    },
    // Update a specific field for a given IP by ID
    updateIPField: async (req, res) => {
        const { id } = req.query; // ID of the IP entry to update
        const { field, value } = req.body; // Field to update and its new value

        if (!id || !field) {
            return res.status(400).json({ error: 'ID and field are required.' });
        }

        const validFields = ['MAC', 'DATA', 'GEO', 'SCAN', 'INTEL']; // Valid fields to update

        if (!validFields.includes(field)) {
            return res.status(400).json({ error: `Field "${field}" is not valid. Valid fields are: ${validFields.join(', ')}.` });
        }

        try {
            // Find the IP entry by ID
            const ipEntry = await IPINT.findByPk(id);

            if (!ipEntry) {
                return res.status(404).json({ error: 'IP entry not found.' });
            }

            // Update the specified field
            ipEntry[field] = value;
            await ipEntry.save();

            console.log(`[5ELG-API] IP field updated: ID=${id}, field=${field}, value=${value}`);
            res.status(200).json({ message: 'IP field updated successfully.', ipEntry });
        } catch (error) {
            console.error('[5ELG-API] Error updating IP field:', error.message);
            res.status(500).json({ error: 'Error updating IP field.' });
        }
    },
    // Endpoint to update an IP entry by ID
    updateIP: async (req, res) => {
        try {
            const id = req.query.id; // Get the ID from the query parameter
            if (!id) {
                return res.status(400).json({ message: 'Error: Missing ID parameter in query.' });
            }

            const {
                IP,
                MAC,
                DATA,
                GEO,
                SCAN,
                INTEL
            } = req.body; // Extract the fields from the request body

            // Check if the entry exists
            const ipEntry = await IPINT.findByPk(id);
            if (!ipEntry) {
                return res.status(404).json({ message: `Error: IP entry with ID ${id} not found.` });
            }

            // Update the fields
            await ipEntry.update({
                IP: IP || ipEntry.IP,
                MAC: MAC || ipEntry.MAC,
                DATA: DATA || ipEntry.DATA,
                GEO: GEO || ipEntry.GEO,
                SCAN: typeof SCAN === 'boolean' ? SCAN : ipEntry.SCAN, // Ensure SCAN is a boolean
                INTEL: INTEL || ipEntry.INTEL,
            });

            res.status(200).json({
                message: `IP entry with ID ${id} updated successfully.`,
                updatedEntry: ipEntry,
            });
        } catch (error) {
            console.error('[5ELG-API] Error updating IP:', error.message);
            res.status(500).json({ message: 'Error updating IP.', error: error.message });
        }
    },
    // Perform a scan on a specific IP
    scannIP: async (req, res) => {
        const { IP } = req.body;
        if (!IP) {
            return res.status(400).json({ error: 'IP address is required' });
        }

        try {
            const ipEntry = await IPINT.findOne({ where: { IP } });
            if (!ipEntry) {
                return res.status(404).json({ error: 'IP not found' });
            }

            // Simulate scanning the IP
            ipEntry.SCAN = true; // Set SCAN to true to indicate it has been scanned
            await ipEntry.save();

            res.status(200).json({ message: `IP ${IP} has been scanned`, ipEntry });
        } catch (error) {
            console.error('[5ELG-API] Error scanning IP:', error.message);
            res.status(500).json({ error: 'Error scanning IP' });
        }
    },

    // Delete a specific IP
    deleteIP: async (req, res) => {
        const { ID } = req.body;
        if (!ID) {
            return res.status(400).json({ error: 'IP address is required' });
        }

        try {
            const result = await IPINT.destroy({ where: { ID } });
            if (result === 0) {
                return res.status(404).json({ error: 'IP not found' });
            }
            res.status(200).json({ message: `IP ${ID} has been deleted` });
        } catch (error) {
            console.error('[5ELG-API] Error deleting IP:', error.message);
            res.status(500).json({ error: 'Error deleting IP' });
        }
    },

    // Purge all IP entries
    purgeIPs: async (req, res) => {
        
        try {
            await IPINT.destroy({ where: {}, truncate: true});
            
            console.log('[5ELG-API] All IPs purged successfully');
        } catch (error) {
            console.error('[5ELG-API] Error purging IPs:', error.message);
        }

    },

    // Output all IPs as a JSON response
    allIPs: async (req, res) => {
        try {
            const allIPs = await IPINT.findAll();
            res.status(200).json({ ips: allIPs });
        } catch (error) {
            console.error('[5ELG-API] Error outputting all IPs:', error.message);
            res.status(500).json({ error: 'Error outputting all IPs' });
        }
    },

    // Output information for a specific IP
    ipout: async (req, res) => {
        const { IP } = req.body;
        if (!IP) {
            return res.status(400).json({ error: 'IP address is required' });
        }

        try {
            const ipEntry = await IPINT.findOne({ where: { IP } });
            if (!ipEntry) {
                return res.status(404).json({ error: 'IP not found' });
            }
            res.status(200).json({ ip: ipEntry });
        } catch (error) {
            console.error('[5ELG-API] Error outputting IP info:', error.message);
            res.status(500).json({ error: 'Error outputting IP info' });
        }
    }
};

// Rutas de la API
router.delete('/purge', apiHandlers.clearLogs); ///purge
//router.delete('/purge/id', apiHandlers.clearLogs); ///purge

router.get('/out/backup', apiHandlers.generateCsvLogs); ///out/backup
router.get('/count', apiHandlers.countDealers); ///count
router.get('/out/info', apiHandlers.csvClientInfo); ///out/all
router.get('/out/all', apiHandlers.csvAllClients); ///out/all
router.get('/out/client', apiHandlers.getClientFInfo); //OK
router.get('/out/upload', apiHandlers.uploadCSVDealerData); 

// Rutas para subir archivos
router.post('/upload', upload.single('file'), apiHandlers.upload);
router.post('/uploads', upload.array('files'), apiHandlers.uploads);
router.get('/files', apiHandlers.getfiles); //VAROIS
router.get('/file/:filename', apiHandlers.getSingleFile); //VAROIS
router.get('/getfiles/:ID', apiHandlers.getFileFromID); //VAROIS

//router.get('/getfingerdata/:ID', ); //VAROIS

router.get('/last7', apiHandlers.last7Logs); //OK
router.get('/total', apiHandlers.totalLogs); //OK
router.get('/dealers', apiHandlers.logsByDealer);
router.get('/ip', apiHandlers.logsByIP);
router.get('/fbro', apiHandlers.FingerBrows);
router.get('/fus', apiHandlers.fingersUsers);

router.get('/getfinger/getlogs/:userId', apiHandlers.logbyFU);
router.get('/getfinger/getIPlogs/:IPD', apiHandlers.logbyIP);

router.get('/getfinger/:userId', apiHandlers.FingerByUserID);

router.get('/options/env', apiOptionsHandlers.getENVVars); //VAROIS
router.get('/options/getbackups', apiOptionsHandlers.getBackups); //VAROIS
router.get('/options/dealers', apiOptionsHandlers.getDealers); //VAROIS
router.get('/options/getdealer/:filename', apiOptionsHandlers.downloadDealer); //VAROIS
router.get('/options/domains', apiOptionsHandlers.getDomains);
router.post('/options/domains', apiOptionsHandlers.addDomain);
router.get('/options/domains/:id', apiOptionsHandlers.findDomainById);
router.patch('/options/domains/:id/activate', apiOptionsHandlers.activateDomain);

router.get('/ips/lists', apiScannersHandlers.listsIPs);
router.get('/ips/info', apiScannersHandlers.infoIP);
router.post('/ips/scann', apiScannersHandlers.scannIP);
router.post('/ips/delete', apiScannersHandlers.deleteIP);
router.post('/ips/purge', apiScannersHandlers.purgeIPs);
router.post('/ips/out/all', apiScannersHandlers.allIPs);
router.post('/ips/out/ip', apiScannersHandlers.ipout);

router.post('/ips/check', apiScannersHandlers.checkOrCreateIP);
router.post('/ips/add', apiScannersHandlers.updateIP);
router.post('/ips/update', apiScannersHandlers.updateIPField);

router.post('/ips/run/scann', apiScannersHandlers.runScanner);
router.post('/ips/run/geo', apiScannersHandlers.runGeo);
router.post('/ips/run/osint', apiScannersHandlers.runOSINT);


console.log("[5ELG-API] API functions loaded successfully");

// Exportar el router
module.exports = router;
