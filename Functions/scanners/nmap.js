const { NmapScan } = require('node-nmap'); // Paquete node-nmap
const { IPINT } = require('../db'); // Modelo Sequelize

async function scanAndUpdateWithNmap(ip) {
    try {
        console.log(`[5ELG-NMAP] Iniciando escaneo NMAP para IP: ${ip}`);

        const nmapScan = new NmapScan(ip, '-sV -F');

        // Escucha el evento "complete" para procesar los resultados del escaneo
        nmapScan.on('complete', async (nmapResults) => {
            try {
                console.log(`[5ELG-NMAP] Escaneo NMAP completado para IP: ${ip}`);
                console.log(`[5ELG-NMAP] Nmap scan results for IP: ${ip}`, nmapResults);

                // Buscar el registro de la IP
                const ipRecord = await IPINT.findOne({ where: { IP: ip } }); // Agregar await aquí
                if (!ipRecord) {
                    console.error(`[5ELG-NMAP] No record found for IP: ${ip}`);
                    return;
                }

                console.log(`[5ELG-NMAP] Found record for IP: ${ip}`, ipRecord);

                // Parsear los datos existentes
                let existingData = {};
                if (ipRecord.DATA) {
                    try {
                        existingData = JSON.parse(JSON.parse(ipRecord.DATA));
                    } catch (error) {
                        console.warn(`[5ELG-NMAP] Error parsing existing DATA for IP: ${ip}. Initializing as empty object.`);
                        existingData = {};
                    }
                }

                // Fusionar datos existentes con los nuevos resultados
                const insertData = {
                    ...existingData,
                    nmap: nmapResults // Agregar resultados de Nmap                    
                };

                console.log(`[5ELG-NMAP] Merged DATA for IP: ${ip}`, insertData);

                // Actualizar el registro en la base de datos
                await IPINT.update({ DATA: JSON.stringify(insertData) }, { where: { IP: ip } }); // Agregar where correctamente

                console.log(`[5ELG-NMAP] Updated DATA in database for IP: ${ip}`);
            } catch (error) {
                console.error(`[5ELG-NMAP] Error al actualizar los datos de NMAP para la IP: ${ip}`, error);
            }
        });

        // Escucha el evento "error" para manejar errores durante el escaneo
        nmapScan.on('error', (error) => {
            console.error(`[5ELG-NMAP] Error durante el escaneo NMAP para la IP: ${ip}`, error);
        });

        // Iniciar el escaneo de Nmap
        nmapScan.startScan();
    } catch (error) {
        console.error(`[5ELG-NMAP] Error al iniciar el escaneo NMAP para la IP: ${ip}`, error);
    }
}

module.exports = { scanAndUpdateWithNmap };
