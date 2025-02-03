const axios = require('axios');
require('dotenv').config();
const { IPINT } = require('../db'); // Modelo IPINT

// Función para obtener información de VirusTotal
async function fetchVirusTotalData(ip) {
    const API_KEY = process.env.VIRUSTOTAL_KEY;

    if (!API_KEY) {
        console.error("Error: VIRUSTOTAL_KEY no está configurada en las variables de entorno.");
        return null;
    }

    try {
        // URL del endpoint para consultar IPs
        const url = `https://www.virustotal.com/api/v3/ip_addresses/${ip}`;
        
        // Realizar la solicitud a la API de VirusTotal
        const response = await axios.get(url, {
            headers: {
                'x-apikey': API_KEY, // Agregar la clave API en las cabeceras
            },
        });

        // Mostrar los datos obtenidos de la API
        const data = response.data;
        console.log(`Datos de VirusTotal para la IP ${ip}:`, JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error(`Error obteniendo información de VirusTotal para la IP ${ip}:`, error.message);
        if (error.response) {
            console.error("Detalles del error:", JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// Función para actualizar la base de datos con la información de VirusTotal
async function updateVirusTotalIPData(ip) {
    try {
        // Buscar la IP en la base de datos
        const ipRecord = await IPINT.findOne({ where: { IP: ip } });

        if (!ipRecord) {
            console.error(`[5ELG-DB] IP ${ip} not found in the database.`);
            return;
        }

        // Obtener datos de VirusTotal
        const virusTotalData = await fetchVirusTotalData(ip);

        if (!virusTotalData) {
            console.error('No data received from VirusTotal.');
            return;
        }

        // Fusionar los datos existentes en `DATA` con los nuevos datos de VirusTotal
        const existingData = ipRecord.DATA || {}; // Datos existentes en el campo `DATA`
        const updatedData = {
            ...existingData,
            virustotal: virusTotalData, // Agregar datos nuevos de VirusTotal
        };

        // Actualizar el registro en la base de datos
        await ipRecord.update({ DATA: updatedData });
        console.log(`IP ${ip} updated successfully in the database with VirusTotal data.`);
    } catch (error) {
        console.error('Error updating IP data in the database:', error.message);
    }
}
/*
// Ejemplo de uso
(async () => {
    const targetIP = '8.8.8.8'; // Cambia esto por la IP que desees consultar
    await updateVirusTotalIPData(targetIP);
})();
*/
module.exports = { fetchVirusTotalData, updateVirusTotalIPData };
