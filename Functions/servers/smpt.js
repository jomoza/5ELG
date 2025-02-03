// Import necessary modules
const SMTPServer = require("smtp-server").SMTPServer;
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Configuration parameters
const args = process.argv.slice(2);
const SERVER_IP = args[0] || "127.0.0.1";
const DOMAIN = args[1] || "example.com";
const PORT = 2525;

// Directory to store logs
const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

// Utility function to log messages
const logMessage = (message) => {
    const logFile = path.join(LOG_DIR, "smtp_server.log");
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logEntry);
    console.log(logEntry);
};

    // Function to generate temporary user credentials
const generateUser = () => {
    const username = crypto.randomBytes(4).toString("hex");
    const password = crypto.randomBytes(8).toString("hex");
    temporaryUsers[username] = password;
    logMessage(`Generated temporary user: ${username} with password: ${password}`);
    return { username, password };
};


function runSMTPServer(DOMAIN,SERVER_IP,PORT){ //}:${PORT} for domain ${}`);
    // Temporary user storage
    const temporaryUsers = {};


    // Create SMTP server instance
    const server = new SMTPServer({
        onAuth(auth, session, callback) {
            const { username, password } = auth;
            if (temporaryUsers[username] && temporaryUsers[username] === password) {
                logMessage(`Authentication successful for user: ${username}`);
                callback(null, { user: username });
            } else {
                logMessage(`Authentication failed for user: ${username}`);
                return callback(new Error("Invalid username or password"));
            }
        },

        onData(stream, session, callback) {
            let emailData = "";
            stream.on("data", (chunk) => {
                emailData += chunk;
            });
            stream.on("end", () => {
                logMessage(`Received email from: ${session.envelope.mailFrom.address} to: ${session.envelope.rcptTo.map(r => r.address).join(", ")}\n${emailData}`);
                callback();
            });
        },

        onConnect(session, callback) {
            logMessage(`New connection from: ${session.remoteAddress}`);
            callback();
        },

        onClose(session) {
            logMessage(`Connection closed: ${session.remoteAddress}`);
        },

        disabledCommands: ["STARTTLS"],
        logger: false,
        banner: `[5ELG-SMTP] Running SMTP server`
    });

    // Start the server
    server.listen(PORT, SERVER_IP, () => {
        console.log("[5ELG-SERVICES] SMTP server is running at smtp://"+HOST+":587");
        generateUser();
    });
}

// Export utility functions for external usage
module.exports = {
    generateUser, runSMTPServer
};
