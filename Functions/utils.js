const { FINGERDATA,Log,Op } = require('./db'); // Modelo de base de datos para logs
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const Handlebars = require('handlebars');

require('dotenv').config();

const domainsConfigPath = process.env.DOMAINS_CONFIG;

// Habilitar el acceso a las propiedades y métodos del prototipo
const runtimeOptions = {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
};

// Leer archivo de forma segura
const readFileSafe = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`[!] Error leyendo archivo ${filePath}:`, err.message);
        return null;
    }
};


async function saveFileToUploadPath(id, filename, filecontent) {
    try {
        // Obtener el directorio base de UPLOAD_PATH desde el archivo .env
        const uploadPath = process.env.UPLOAD_PATH;

        if (!uploadPath) {
            throw new Error('UPLOAD_PATH is not defined in the .env file.');
        }

        // Crear la ruta completa para la carpeta del ID
        const folderPath = path.join(uploadPath, id.toString());

        // Crear la carpeta si no existe
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`[5ELG] Folder created: ${folderPath}`);
        }

        // Crear la ruta completa para el archivo
        const filePath = path.join(folderPath, filename);

        // Escribir el contenido en el archivo
        fs.writeFileSync(filePath, filecontent);
        console.log(`[5ELG] File saved successfully: ${filePath}`);
    } catch (error) {
        console.error('[5ELG] Error saving file:', error);
        throw error;
    }
}

const renderTemplate = (res, templatePath, data) => {
    const fs = require('fs');
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    // Compilar y renderizar la plantilla con las opciones habilitadas
    const template = Handlebars.compile(templateContent, runtimeOptions);
    const renderedContent = template(data, runtimeOptions);

    res.send(renderedContent);
};


// Generar CSV de los logs
async function generateCSV(logs) {
    try {
        if (!logs || logs.length === 0) {
            throw new Error('No hay logs disponibles para generar el CSV.');
        }

        // Configurar las columnas para el CSV 
        const fields = [
            'Id',
            'Ts',
            'Dl',
            'Ed',
            'Er',
            'html',
            'screen',
            'Ip',
            'Ua',
            'Fu',
            'Fb',
            'Fr',
            'Jd'
        ];

        const opts = { fields };
        const parser = new Parser(opts);
        const csv = parser.parse(logs);

        return csv;
    } catch (err) {
        console.error('[!] Error generando el CSV:', err.message);
        throw err;
    }
}

// Generar CSV para la tabla IPINT
async function generateCSVIP(ipRecords) {
    try {
        if (!ipRecords || ipRecords.length === 0) {
            throw new Error('No IP records available to generate the CSV.');
        }

        // Configurar las columnas para el CSV
        const fields = [
            'ID',
            'IP',
            'MAC',
            'DATA',
            'GEO',
            'SCAN',
            'INTEL'
        ];

        const opts = { fields };
        const parser = new Parser(opts);
        const csv = parser.parse(ipRecords);

        return csv;
    } catch (err) {
        console.error('[!] Error generating IP CSV:', err.message);
        throw err;
    }
}


function processDealerData({ fpRequest, encodedScr, encodedPage, jsData, encodedReq, rts, ip, userAgent, fpUser, fpBrowser }) {
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
            console.log('[5ELG-DEALER] Datos registrados:', { fpUser, rts });
        })
        .catch((err) => {
            console.error('[DealerHandler] Error al guardar los datos:', err);
        });
}

// Realizar un backup de todos los logs en la base de datos en formato CSV
async function handleBackupLogs() {
    try {
        const logs = await Log.findAll(); // Obtener todos los logs de la base de datos
        if (logs.length === 0) {
            throw new Error('No hay logs en la base de datos para respaldar.');
        }

        // Generar el CSV
        const csv = await generateCSV(logs.map(log => log.toJSON()));

        // Guardar el archivo CSV en el sistema
        const backupDir = process.env.BACKUP_PATH;
        if (!backupDir) {
            throw new Error('La variable de entorno BACKUP_PATH no está definida.');
        }
        const backupPath = path.join(backupDir, `backup_logs_${Date.now()}.csv`);
        fs.writeFileSync(backupPath, csv, 'utf8');
        console.log(`[5ELG] Backup generado con éxito en: ${backupPath}`);
        return backupPath;
    } catch (err) {
        console.error('[!] Error al realizar el backup:', err.message);
        throw err;
    }
}

// Eliminar registros de logs
async function clearLogs(id = null) {
    try {
        if (id) {
            // Eliminar un registro específico por su ID
            const log = await Log.destroy({ where: { id } });
            if (!log) {
                throw new Error(`No se encontró un log con el ID ${id}`);
            }
            console.log(`[5ELG] Log con ID ${id} eliminado con éxito.`);
            return `Log con ID ${id} eliminado con éxito.`;
        } else {
            // Eliminar todos los registros
            const deletedCount = await Log.destroy({ where: {} });
            console.log(`[5ELG] Todos los logs han sido eliminados. (${deletedCount} registros eliminados)`);
            return 'Todos los logs han sido eliminados.';
        }
    } catch (err) {
        console.error('[!] Error al eliminar logs:', err.message);
        throw err;
    }
}

async function addFingerprintRecord(newData) {
    try {
        // Check if a record with the same `FU` and `FB` already exists
        const existingRecord = await FINGERDATA.findOne({
            where: { FU: newData.FU, FB: newData.FB },
        });

        if (existingRecord) {
            return existingRecord; // Return the existing record
        }

        // Create a new record
        const newRecord = await FINGERDATA.create(newData);
        console.log(`[5ELG] New record added successfully with ID: ${newRecord.ID}`);
        return newRecord;
    } catch (error) {
        console.error('[5ELG] Error adding new record:', error);
        throw error;
    }
}

async function updateFingerprintRecordByFU(fu, updates, column) {
    try {
        // Verificar que el parámetro de columna sea válido
        const validColumns = ['IPS', 'NETDATA', 'INTEL', 'PWD'];
        if (!validColumns.includes(column)) {
            throw new Error(`[5ELG] Invalid column: ${column}. Valid columns are: ${validColumns.join(', ')}`);
        }

        // Buscar el registro por el campo FU
        const record = await FINGERDATA.findOne({ where: { FU: fu } });
        if (!record) {
            console.log(`[5ELG] No record found with FU: ${fu}`);
            return null;
        }

        // Actualizar el campo especificado
        const updateData = {};
        updateData[column] = updates; // Asignar los datos de la actualización a la columna correspondiente

        await record.update(updateData);

        console.log(`[5ELG] Record with FU: ${fu} updated successfully in column: ${column}`);
        return record;
    } catch (error) {
        console.error('[5ELG] Error updating record by FU:', error);
        throw error;
    }
}


async function getAllFingerprintRecords() {
    try {
        const records = await FINGERDATA.findAll();
        if (records.length === 0) {
            console.log('[5ELG] No records found in the database.');
        }
        return records;
    } catch (error) {
        console.error('[5ELG] Error retrieving all records:', error);
        throw error;
    }
}

async function getFingerprintRecordByID(id) {
    try {
        const record = await FINGERDATA.findAll({ where: { FU: id } });
        
        if (!record) {
            console.log(`[5ELG] No record found with ID: ${id}`);
            return null;
        }
        return record;
    } catch (error) {
        console.error('[5ELG] Error retrieving record by ID:', error);
        throw error;
    }
}


// Function to get all domains
function getDomains() {
    const data = fs.readFileSync(domainsConfigPath, 'utf8');
    const json = JSON.parse(data);
    return json.domains;
}

// Function to add a new domain
function addDomain(newDomain) {
    const data = fs.readFileSync(domainsConfigPath, 'utf8');
    const json = JSON.parse(data);
    newDomain.id = json.domains.length ? json.domains[json.domains.length - 1].id + 1 : 0;
    json.domains.push(newDomain);
    fs.writeFileSync(domainsConfigPath, JSON.stringify(json, null, 2), 'utf8');
}

// Function to find a domain by id
function findDomainById(domainId) {
    const data = fs.readFileSync(domainsConfigPath, 'utf8');
    const json = JSON.parse(data);
    return json.domains.find(domain => domain.id === domainId);
}

// Function to change the status of a domain from inactive to active
function activateDomain(domainId) {
    const data = fs.readFileSync(domainsConfigPath, 'utf8');
    const json = JSON.parse(data);
    const domain = json.domains.find(domain => domain.id === domainId);
    if (domain && domain.status === 'inactive') {
        domain.status = 'active';
        fs.writeFileSync(domainsConfigPath, JSON.stringify(json, null, 2), 'utf8');
    }
}

module.exports = {
    generateCSV,
    handleBackupLogs,
    processDealerData,
    generateCSVIP,
    readFileSafe,
    saveFileToUploadPath,
    updateFingerprintRecordByFU,
    getAllFingerprintRecords,
    getFingerprintRecordByID,
    addFingerprintRecord,
    getDomains,
    addDomain,
    findDomainById,
    activateDomain,
    renderTemplate,
    clearLogs,
};
