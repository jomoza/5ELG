const whois = require('whois-json');
const axios = require('axios');
const { IPINT } = require('../db'); // Modelo Sequelize

// Función para obtener la geolocalización de una dirección IP
async function fetchGeoLocation(ip, retries = 3) {
    try {
        const API_KEY = process.env.INFODB_KEY;

        const response = await axios.get(`https://ipinfo.io/${ip}/json?token=${API_KEY}`);
        const geoData = response.data;

        console.log(`[5ELG-GEO] Geolocation data for IP ${ip}:`, geoData);
        return geoData;
    } catch (error) {
        if (retries > 0) {
            console.warn(`[5ELG-GEO] Error fetching geolocation for IP ${ip}. Retrying in 5 seconds... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos antes de reintentar
            return fetchGeoLocation(ip, retries - 1);
        } else {
            console.error(`[5ELG-GEO] Error fetching geolocation for IP ${ip}:`, error.message);
            return null;
        }
    }
}

async function runwhois(host) {
    try {
        console.log(`[5ELG-WHOIS] Fetching WHOIS data for IP: ${host}`);

        const whoisData = await whois(host); // Obtener datos de WHOIS
        console.log(`[5ELG-WHOIS] WHOIS data fetched successfully for IP: ${host}`, whoisData);

        // Buscar el registro de la IP
        const ipRecord = await IPINT.findOne({ where: { IP: host } }); // Usar await
        if (!ipRecord) {
            console.warn(`[5ELG-WHOIS] No record found for IP: ${host}`);
            return null; // Devolver null si no se encuentra el registro
        }

        console.log(`[5ELG-WHOIS] Found record for IP: ${host}`, ipRecord);

        // Parsear los existingData,stingData,os existentes
        let existingData = JSON.parse(JSON.parse(ipRecord.DATA)) || {};


        // Fusionar los datos WHOIS
        const insertData = {
            ...existingData, // Agregar resultados de Nmap
            whois: whoisData            
        };
        console.log(insertData);

        console.log(`[5ELG-WHOIS] Merged DATA for IP: ${host}`, insertData);

        // Actualizar el registro
        await IPINT.update({ DATA: JSON.stringify(insertData) }, { where: { IP: host } }); // Agregar where correctamente

        console.log(`[5ELG-WHOIS] Updated DATA in database for IP: ${host}`);
        return existingData; // Devolver los datos actualizados
    } catch (error) {
        console.error(`[5ELG-WHOIS] Error updating WHOIS data for IP: ${host}`, error);
        throw error; // Relanzar el error para manejarlo en el flujo superior
    }
}


async function geolocateAndUpdate(ip) {
    try {
        console.log(`[5ELG-GEO] Fetching geolocation data for IP: ${ip}`);
        const geoData = await fetchGeoLocation(ip); // Obtener los datos de geolocalización
        if (!geoData) {
            console.warn(`[5ELG-GEO] No geolocation data found for IP: ${ip}`);
            return;
        }

        // Buscar el registro de la IP en la base de datos
        const ipRecord = await IPINT.findOne({ where: { IP: ip } });
        if (!ipRecord) {
            console.warn(`[5ELG-GEO] No record found for IP: ${ip}`);
            return;
        }

        // Actualizar el registro
        await ipRecord.update(
            {
                GEO: geoData, // Opcional: si quieres guardar GEO separado
            }
        );

        console.log(`[5ELG-GEO] Geolocation data successfully updated for IP: ${ip}`);
    } catch (error) {
        console.error(`[5ELG-GEO] Error updating geolocation data for IP: ${ip}`, error);
        throw error; // Relanzar el error para manejarlo en la transacción
    }
}

module.exports = { runwhois, geolocateAndUpdate };
