const pcap = require('pcap'); // Use the pcap library for packet capture
const crypto = require('crypto');
const { Log } = require('../../Functions/db'); // Modelo Sequelize

// Function to start ICMP sniffer
function startIcmpListener(interface = 'all') {
    console.log(`[5ELG-ICMP] Starting ICMP sniffer on interface: ${interface || 'ALL'}`);

    // Define filter options
    const optionsICMP = {
        filter: 'icmp',
        monitor: false,
    };

    // Create a pcap session
    const session = pcap.createSession(interface || 'any', optionsICMP);

    console.log(`[5ELG-ICMP] Listening for ICMP packets on interface: ${session.device_name}`);

    // Handle incoming packets
    session.on('packet', (rawPacket) => {
        try {
            const packet = pcap.decode.packet(rawPacket);

            // Extract the IP layer and ICMP layer from the packet
            const ipLayer = packet.payload; // IP layer
            const icmpLayer = ipLayer?.payload; // ICMP layer


            if (ipLayer && icmpLayer) {
                const clientARPId = icmpLayer?.shost?.toString() || 'Unknown';
                const clientIP = icmpLayer?.saddr?.toString() || 'Unknown';
                
                // Check if it's an ICMP Echo Request (type 8)
                if (icmpLayer?.payload.type === 8) {
                    console.log(`[5ELG-ICMP] PING CALLBACK FROM ${clientIP}`);

                    const icmpData = icmpLayer?.payload?.data ? icmpLayer.payload.data.toString('utf8') : 'No payload';

                    const requestData = {
                        dealer_uri: ipLayer?.daddr?.toString() || 'N/A',
                        merca_uri: 'N/A',
                        requestURL: 'ICMP',
                        data: icmpData,
                        method: 'IPv4',
                    };

                    const encodedReq = Buffer.from(JSON.stringify(requestData)).toString('base64');
                    const encodedData = Buffer.from(JSON.stringify(ipLayer)).toString('base64');


                    const hashReq = crypto.createHash('sha256').update(JSON.stringify(ipLayer)).digest('hex');
                    const hashUsr = 'N/B';
                    const hashbro = clientARPId;

                    const icmpPayload = icmpLayer ? icmpLayer.toString('utf8') : 'ICMP REQUEST';
                    
                    // Log ICMP request
                    Log.create({
                        Dl: 'ICMP.LOG',
                        Ed: ipLayer?.daddr?.toString() || 'Unknown',
                        Er: encodedReq,
                        Ts: new Date().toISOString(),
                        Ip: clientIP,
                        Ua: icmpPayload, // User-Agent is not applicable to ICMP
                        Fu: hashUsr,
                        Fb: hashbro,
                        Fr: hashReq,
                        Jd: encodedData,
                        Html: null,
                        Screen: null,
                    }).then(() => {
                        console.log(`[5ELG-ICMP] Log entry created for ${clientIP}`);
                    }).catch((err) => {
                        console.error(`[5ELG-ICMP] Failed to create log: ${err.message}`);
                    });
                }
            }
        } catch (err) {
            console.error(`[5ELG-ICMP] Error processing packet: ${err.message}`);
        }
    });

    // Handle errors
    session.on('error', (err) => {
        console.error(`[5ELG-ICMP] Error: ${err.message}`);
    });
}

module.exports = { startIcmpListener };
