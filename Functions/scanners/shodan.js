require('dotenv').config();
const ShodanClient = require('shodan-client');
const axios = require('axios');
const { IPINT } = require('../db'); // Modelo Sequelize

// Función para obtener información de Shodan
async function fetchShodanData(ip, retries = 3) {
    try {
        // Obtener información de la IP usando Shodan
        const data = await ShodanClient.host(ip, process.env.SHODAN_API_KEY);
        console.log('[5ELG-SHODAN] Shodan API Response:', data);
        return data;
    } catch (error) {
        if (retries > 0) {
            console.warn(`[5ELG-SHODAN] Error fetching data from Shodan for IP ${ip}. Retrying in 5 seconds... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos antes de reintentar
            return fetchShodanData(ip, retries - 1);
        } else {
            console.error(`[5ELG-SHODAN] Error fetching data from Shodan for IP ${ip}:`, error.message);
            return null;
        }
    }
}

// Función para actualizar la base de datos
async function updateSHODANIPData(ip) {
    try {
        // Buscar la IP en la base de datos
        const ipRecord = await IPINT.findOne({ where: { IP: ip } });

        if (!ipRecord) {
            console.error(`[5ELG-DB] IP ${ip} not found in the database.`);
            return;
        }

        // Obtener datos de Shodan
        const shodanData = await fetchShodanData(ip);

        if (!shodanData) {
            console.error('No data received from Shodan.');
            return;
        }

        // Fusionar los datos existentes en `DATA` con los nuevos datos de Shodan
        let existingData = {};
        if (ipRecord.DATA) {
            try {
                existingData = JSON.parse(JSON.parse(ipRecord.DATA));
            } catch (error) {
                console.warn(`[5ELG-SHODAN] Error parsing existing DATA for IP: ${ip}. Initializing as empty object.`);
                existingData = {};
            }
        }

        // Añadir la información de Shodan sin sobrescribir el resto de los datos
        const updatedData = {
            ...existingData, // Mantener los datos existentes
            shodan: shodanData, // Agregar la nueva información de Shodan
        };

        // Actualizar el registro en la base de datos
        await IPINT.update({ DATA: JSON.stringify(updatedData) }, { where: { IP: ip } }); // Agregar where correctamente
        console.log(`[5ELG-SHODAN] IP ${ip} updated successfully in the database.`);
    } catch (error) {
        console.error('Error updating IP data in the database:', error.message);
    }
}


// Función para obtener información de CriminalIP usando su API
async function fetchCriminalIPReport(ip) {
    const API_KEY = process.env.CRIMINALIP_API_KEY;

    if (!API_KEY) {
        console.error("[5ELG-CRIMINALIP] Error: CRIMINALIP_API_KEY no está configurada en las variables de entorno.");
        return null;
    }

    try {
        // URL del endpoint para consultar IPs con el parámetro `full=true`
        const url = `https://api.criminalip.io/v1/asset/ip/report?ip=${ip}&full=true`;

        // Realizar la solicitud GET con el encabezado de autorización
        const response = await axios.get(url, {
            headers: {
                'x-api-key': API_KEY, // Clave API en el encabezado
            },
        });

        // Mostrar los datos obtenidos de la API
        const data = response.data;
        console.log(`[5ELG-CRIMINALIP] Datos de CriminalIP para la IP ${ip}:`, JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error(`[5ELG-CRIMINALIP] Error obteniendo información de CriminalIP para la IP ${ip}:`, error.message);
        if (error.response) {
            console.error("Detalles del error:", JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// Función para actualizar la base de datos con datos de CriminalIP
async function updateCriminalIPData(ip) {
    try {
        // Buscar la IP en la base de datos
        const ipRecord = await IPINT.findOne({ where: { IP: ip } });

        if (!ipRecord) {
            console.error(`[5ELG-DB] IP ${ip} not found in the database.`);
            return;
        }

        // Obtener datos de CriminalIP
        const criminalIPData = await fetchCriminalIPReport(ip);

        if (!criminalIPData) {
            console.error('No data received from CriminalIP.');
            return;
        }

        let existingData = {};
        if (ipRecord.DATA) {
            try {
                existingData = JSON.parse(JSON.parse(ipRecord.DATA));
            } catch (error) {
                console.warn(`[5ELG-CRIMINALIP] Error parsing existing DATA for IP: ${ip}. Initializing as empty object.`);
                existingData = {};
            }
        }

        // Fusionar los datos existentes con los nuevos datos de CriminalIP
        const updatedData = {
            ...existingData, // Mantener los datos existentes
            criminalip: criminalIPData, // Agregar la nueva información de CriminalIP
        };

        // Actualizar el registro en la base de datos
        await IPINT.update({ DATA: JSON.stringify(updatedData) }, { where: { IP: ip } }); // Agregar where correctamente
        console.log(`IP ${ip} updated successfully in the database with CriminalIP data.`);
    } catch (error) {
        console.error('Error updating IP data in the database:', error.message);
    }
}


module.exports = { updateSHODANIPData, updateCriminalIPData };
