// Banner para el servidor
console.log(`.------. .------. .------. .------.
|5.--. | |E.--. | |L.--. | |G.--. |
| (  ) | | (\\/) | | :/\\: | | :/\\: |
|(_||_)| |  \\/  | | (__) | | :\\/: |
| '--'5| | '--'E| | '--'L| | '--'G|
'------' '------' '------' '------'
[5ELG] Brow5er dEal finGerprinter. FINGERPRINT & OSINT WEB PANEL 
[5ELG] See more at https://github.com/jomoza/5ELG 
_________________________________________________`);


const args = process.argv.slice(2);

if (args.includes('-help')) {
    console.log(`
Usage: node main.js [options]

Options:
  -help          Show this help message and exit
  -ssl           Enable SSL for the HTTP service
  -dns           Start the DNS server
  -icmp          Start the ICMP listener
  -host <host>   Specify the host (default: localhost)
  -port <port>   Specify the port (default: 80)
  -domain <domain> Specify the domain (default: localhost)
  -iface <interface> Specify the network interface (default: lo)

Environment Variables:
  INTERFACE          Network interface to use (default: lo)
  HOST               Host to bind the services (default: localhost)
  DOMAIN             Domain name
  VELG_USER          User for authentication
  VELG_PWD           Password for authentication
  ICMP_LISTENER      Enable ICMP listener (true/false)
  SHODAN_API_KEY     API key for Shodan
  INFODB_KEY         API key for InfoDB
  CRIMINALIP_API_KEY API key for CriminalIP

Examples:
  node main.js -ssl -dns -host 127.0.0.1 -port 8080
  node main.js -icmp -iface eth0
    `);
    process.exit(0);
}


const path = require('path');
const fs = require('fs');
const { startDnsServer } = require('./Functions/servers/dns'); // Base de datos
const { startIcmpListener } = require('./Functions/servers/icmp'); // Base de datos
const { runHTTPService } = require('./Functions/servers/https'); // Base de datos

const { Log, IPINT, sequelize, Op } = require('./Functions/db'); 
const { getDomains } = require('./Functions/utils'); 

require('dotenv').config(); // Cargar variables de entorno

const requiredVars = [
    'INTERFACE',
    'HOST',
    'DOMAIN',
    'VELG_USER',
    'VELG_PWD',
    'ICMP_LISTENER',
    'SHODAN_API_KEY',
    'VIRUSTOTAL_KEY',
    'INFODB_KEY',
    'CRIMINALIP_API_KEY'
];

// Obtener la ruta de la carpeta Dealers
const dealersFolder = path.join(__dirname, 'Dealers');

fs.readdir(dealersFolder, (err, files) => {
    if (err) {
        console.error('[!] Error reading Dealers folder:', err.message);
    } else {
        if (files.length === 0) {
            console.log(' - Dealers folder is empty.');
        } else {
            files.forEach((file) => {
                console.log(`[5ELG-DEALER] Dealer found at: ${process.env.DEALERS_PATH}/${file}`);
            });
        }
    }
});

function checkEnvVars() {
    requiredVars.forEach((varName) => {
        const varValue = process.env[varName];
        if (varValue) {
            console.log(`[5ELG-CONFIG] ${varName} => ${varValue}`);
        } 
    });
}

const isSSL = args.includes('-ssl');

const useDNS = args.includes('-dns');
const useICMP = args.includes('-icmp');

// Determinar host y puerto desde argumentos de línea de comandos, variables de entorno o valores por defecto
const argHostIndex = args.indexOf('-host');
const argPortIndex = args.indexOf('-port');
const argDomainIndex = args.indexOf('-domain');
const argIface = args.indexOf('-iface');


const HOST = argHostIndex !== -1 ? args[argHostIndex + 1] : process.env.HOST || 'localhost';
const PORT = argPortIndex !== -1 ? args[argPortIndex + 1] : process.env.PORT || 80;
const SSL_PORT = argPortIndex !== -1 ? args[argPortIndex + 1] : process.env.SSL_PORT || 443; // Puerto para HTTPS
const DOMAIN = argDomainIndex !== -1 ? args[argDomainIndex + 1] : process.env.DOMAIN || 'localhost'; // Dominio por defecto
const IFACE = argIface !== -1 ? args[argIface + 1] : process.env.INTERFACE || 'lo'; // Dominio por defecto


(async () => {
    //RUN HTTP SERVICE TO RUN DASHBOARD, API, 
    await runHTTPService(isSSL, HOST, PORT, SSL_PORT);
    
    try {
        await sequelize.sync({ force: false, alter: false });
        console.log("[5ELG-DB] Todas las tablas están sincronizadas.");
    } catch (err) {
        console.error("[5ELG-DB] Error al sincronizar la base de datos:", err);
    }


    if( useDNS || process.env["DNS_SERVER"].toLowerCase() == "true" ) {
        console.log("[5ELG-SERVICES] DNS server is running at dns://"+HOST+":53");
        startDnsServer(HOST,DOMAIN,53);                
        const doms = getDomains();
        doms.forEach(domain => {
            console.log(`[5ELG-DOMAIN] ${domain.name} is ${domain.status} | IP: ${domain.ip}`);
        });
        process.env["DNS_SERVER"] = "true";

    }
    if( useICMP || process.env["ICMP_LISTENER"].toLowerCase() == "true" ) {
        console.log("[5ELG-SERVICES] ICMP LISTENER is running at icmp://"+HOST);
        (async () => {
            try {
                await startIcmpListener(IFACE);
                process.env["ICMP_LISTENER"] = "true";
            } catch (err) {
                console.error('[ICMP-SERVER] Failed to start:', err);
            }
        })();

    }
    checkEnvVars();


})();
