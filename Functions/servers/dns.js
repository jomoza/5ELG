const dns = require('native-dns'); // Módulo para manejar DNS
const crypto = require('crypto');
const { Log } = require('../../Functions/db'); // Modelo Sequelize


// Función para registrar logs en formato JSON
async function logRequest(info) {
    
    var encodedReq = Buffer.from(JSON.stringify(info.requestData)).toString('base64');
    var encodedData = Buffer.from(JSON.stringify(info.clientData)).toString('base64');
    
    const hashReq = crypto.createHash('sha256').update(JSON.stringify(info)).digest('hex');
    const hashFng = "N/B"
    const hashbro = crypto.createHash('sha256').update(info.fingerprint).digest('hex');
    

    // Registrar en la base de datos Sequelize (si está configurada)
    try {
      await Log.create({
        Dl: 'DNS.LOG',
        Ed: info.domain,
        Er: encodedReq,
        Ts: info.timestamp,
        Ip: info.clientIp,
        Ua: info.username || 'N/A', // DNS no tiene User-Agent
        Fu: hashFng,
        Fb: hashbro,
        Fr: hashReq,
        Jd: encodedData,
        Html: null,
        Screen: null,
      });
  
      console.log(`[5ELG-DNS-LOG] Log registrado: ${info.domain}`);
    } catch (error) {
      console.error('[5ELG-DNS-LOG] Error al registrar log en base de datos:', error.message);
    }
  }
  

function startDnsServer(Dnshost,domainToRegister,dnsPort) {
    const server = dns.createServer();
  
    server.on('request', (request, response) => {

        const clientIp = request.address.address || 'N/A';
        const clientPort = request.address.port || 'N/A';
        const question = request.question[0] || 'N/A';
        const domain = question.name || 'N/A';
        const fingerprint = domain.replace(`.${domainToRegister}`, '') || 'N/A';
        const timestamp = new Date().toISOString();

        let clientData = {};
        const requestData = {
            counts: {
                qdcount: request.qdcount, // Número de preguntas
                ancount: request.ancount, // Número de respuestas
                nscount: request.nscount, // Número de registros de autoridad
                arcount: request.arcount, // Número de registros adicionales
            },
            questions: request.question.map((q) => ({
                name: q.name, // Nombre del dominio
                type: dns.consts.QTYPE_TO_NAME[q.type] || 'UNKNOWN', // Tipo de registro (A, MX, etc.)
                class: dns.consts.QCLASS_TO_NAME[q.class] || 'UNKNOWN', // Clase del registro (IN, CH, etc.)
            })),
            answers: request.answer.map((a) => ({
                name: a.name,
                type: dns.consts.QTYPE_TO_NAME[a.type] || 'UNKNOWN',
                class: dns.consts.QCLASS_TO_NAME[a.class] || 'UNKNOWN',
                ttl: a.ttl,
                data: a.data,
            })),
            authorities: request.authority.map((auth) => ({
                name: auth.name,
                type: dns.consts.QTYPE_TO_NAME[auth.type] || 'UNKNOWN',
                class: dns.consts.QCLASS_TO_NAME[auth.class] || 'UNKNOWN',
                ttl: auth.ttl,
                data: auth.data,
            })),
            additionals: request.additional.map((add) => ({
                name: add.name,
                type: dns.consts.QTYPE_TO_NAME[add.type] || 'UNKNOWN',
                class: dns.consts.QCLASS_TO_NAME[add.class] || 'UNKNOWN',
                ttl: add.ttl,
                data: add.data,
            })),
        };
        requestData.dealer_uri = "N/A";

        requestData.merca_uri = domain;
        requestData.requestURL = "DNS"
        requestData.method = dns.consts.QTYPE_TO_NAME[question.type] || 'UNKNOWN';
        
        clientData.header = {
                id: request.header.id, // ID de la solicitud
                qr: request.header.qr, // Flag de respuesta
                opcode: request.header.opcode, // Opcode de la solicitud
                aa: request.header.aa, // Flag de respuesta autoritativa
                tc: request.header.tc, // Flag de truncamiento
                rd: request.header.rd, // Recursión deseada
                ra: request.header.ra, // Recursión disponible
                res1: request.header.res1 || 0, // Reservado 1
                res2: request.header.res2 || 0, // Reservado 2
                res3: request.header.res3 || 0, // Reservado 3
                rcode: dns.consts.RCODE_TO_NAME[request.header.rcode] || 'UNKNOWN', // Código de respuesta
            },
        clientData.rawPacket = request.rawPacket, // Paquete DNS en formato hexadecimal
        clientData.edns = {
            version: request.edns ? request.edns.version : 'N/A', // Versión EDNS (si existe)
            options: request.edns ? request.edns.options : [], // Opciones EDNS (si existen)
            payloadSize: request.edns ? request.edns.payloadSize : 'N/A', // Tamaño máximo permitido
        },

        // Loguear la solicitud DNS
        logRequest({
            clientIp,
            timestamp,
            clientPort,
            domain,
            fingerprint,
            clientData,
            requestData,
        });        

      // Responder si el dominio coincide con el registrado
      request.question.forEach((question) => {
        console.log(`[5ELG-DNS] Domain Requested: ${question.name}`);
        console.log(`[5ELG-DNS] Domain Requested: ${domainToRegister}`);
        console.log(`[5ELG-DNS] Query Type: ${dns.consts.QTYPE_TO_NAME[question.type]}`);
        if (question.name.endsWith(domainToRegister)) {
          console.log(`[5ELG-DNS-RESPONSE] Responding for domain: ${domainToRegister}`);

          response.answer.push(
            dns.A({
              name: question.name,
              address: '127.0.0.1', // Devuelve una dirección IP estática (se puede personalizar)
              ttl: 600, // Tiempo de vida de la respuesta
            })
          );
        } else {
          console.log(`[5ELG-DNS-RESPONSE] No record for domain: ${question.name}`);
        }
      });
  
      response.send();
    });
  
    server.on('error', (err) => {
      console.error(`[5ELG-DNS-ERROR] ${err}`);
    });
  
    server.on('listening', () => {
      console.log(`[5ELG-DNS-SERVER] Listening on port ${dnsPort}`);
      console.log(`[5ELG-DNS-SERVER] Registered domain: ${domainToRegister}`);
    });
  
    server.on('socketError', (err) => {
      console.error(`[5ELG-DNS-SOCKET-ERROR] ${err}`);
    });
  
    server.on('close', () => {
      console.log('[5ELG-DNS-SERVER] Server closed');
    });
  
    // Iniciar el servidor en el puerto especificado
    server.serve(dnsPort, Dnshost);
  }

  module.exports = { startDnsServer };