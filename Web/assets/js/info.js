
function getIpInfo(ip) {
  const isPrivate = isPrivateIP(ip);
  
  if (isPrivate) {
    Swal.fire({
      title: 'Private IP Address',
      text: 'Requests cannot be made for private IP addresses.',
      icon: 'info',
      confirmButtonText: 'OK'
    });
    return;
  }

  const apiUrl = `https://api.ipapi.is/?ip=${ip}`;
  
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Error fetching from the API');
      }
      return response.json();
    })
    .then(data => {
      const content = `
        <style>
          .info-container {
            text-align: left; /* Left-aligned for better readability */
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
          }
          ul.table {
            list-style-type: none;
            padding: 0;
            margin: 0;
            width: 100%;
          }
          ul.table li {
            padding: 6px 0;
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #e0e0e0;
          }
          ul.table li strong {
            width: 30%;
            font-weight: bold;
          }
        </style>
        <div class="info-container">
          <ul class="table">
            <li><strong>Company:</strong> ${data.company ? data.company.name : 'N/A'}</li>
            <li><strong>Location:</strong> ${data.location ? data.location.city + ', ' + data.location.state + ', ' + data.location.country : 'N/A'}</li>
            <li><strong>Coordinates:</strong> ${data.location ? data.location.latitude + ', ' + data.location.longitude : 'N/A'}</li>
            <li><strong>ASN:</strong> ${data.asn ? data.asn.asn + ' - ' + data.asn.descr : 'N/A'}</li>
            <li><strong>Abuse Contact:</strong> ${data.abuse ? `${data.abuse.name}, Email: ${data.abuse.email}, Phone: ${data.abuse.phone}` : 'N/A'}</li>
            <li><strong>Is Bogon:</strong> ${data.is_bogon ? 'Yes' : 'No'}</li>
            <li><strong>Is Mobile:</strong> ${data.is_mobile ? 'Yes' : 'No'}</li>
            <li><strong>Is Crawler:</strong> ${data.is_crawler ? 'Yes' : 'No'}</li>
            <li><strong>Is Data Center:</strong> ${data.is_datacenter ? 'Yes' : 'No'}</li>
            <li><strong>Is TOR:</strong> ${data.is_tor ? 'Yes' : 'No'}</li>
            <li><strong>Is Proxy:</strong> ${data.is_proxy ? 'Yes' : 'No'}</li>
            <li><strong>Is VPN:</strong> ${data.is_vpn ? 'Yes' : 'No'}</li>
            <li><strong>Is Abuser:</strong> ${data.is_abuser ? 'Yes' : 'No'}</li>
          </ul>
          <p><strong>Note:</strong> This is a public IP address.</p>
        </div>
      `;

      Swal.fire({
        title: `IP Information: ${data.ip}`,
        html: content,
        icon: 'info',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'swal-wide' // Optional: You can add custom width classes for larger popups
        }
      });
    })
    .catch(error => {
      console.error('Error:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error fetching IP information. Please check the entered IP address.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
}

function getWhoisInfo(ipAddress) {
  if (isPrivateIP(ipAddress)) {
    Swal.fire({
      title: "Private IP Address",
      text: "Requests cannot be made for private IP addresses.",
      icon: "info",
      confirmButtonText: "OK"
    });
    return; 
  }

  const url = `https://rdap.db.ripe.net/ip/${ipAddress}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const whoisInfo = {
        handle: data.handle || 'N/A',
        name: data.name || 'N/A',
        country: data.country || 'N/A',
        startAddress: data.startAddress || 'N/A',
        endAddress: data.endAddress || 'N/A',
        entities: data.entities.map(entity => {
          const nameField = entity.vcardArray[1].find(field => field[0] === "fn");
          const name = nameField ? nameField[3] : 'N/A';

          const emailField = entity.vcardArray[1].find(field => field[0] === 'email');
          const email = emailField ? emailField[3] : 'N/A'; 

          const telephoneFields = entity.vcardArray[1].filter(field => field[0] === 'tel');
          const telephone = telephoneFields.length ? telephoneFields.map(tel => tel[3]).join(', ') : 'N/A';
          
          return {
            name: name, 
            role: entity.roles.length ? entity.roles.join(', ') : 'N/A',
            email: email, 
            telephone: telephone 
          };
        })
      };

      let entitiesText = '';
      whoisInfo.entities.forEach(entity => {
        entitiesText += `
          <ul class="table">
            <li><strong>Name:</strong> ${entity.name}</li>
            <li><strong>Role:</strong> ${entity.role}</li>
            <li><strong>Email:</strong> ${entity.email}</li>
            <li><strong>Telephone:</strong> ${entity.telephone}</li>
          </ul>
        `;
      });

      const info = `
        <style>
          ul.table {
            list-style-type: none;
            padding: 0;
            margin: 0;
            width: 100%;
          }
          ul.table li {
            padding: 6px 0;
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #e0e0e0;
          }
          ul.table li strong {
            width: 30%;
            font-weight: bold;
          }
        </style>
        <strong>Handle:</strong> ${whoisInfo.handle}<br>
        <strong>Name:</strong> ${whoisInfo.name}<br>
        <strong>Country:</strong> ${whoisInfo.country}<br>
        <strong>Start Address:</strong> ${whoisInfo.startAddress}<br>
        <strong>End Address:</strong> ${whoisInfo.endAddress}<br><br>
        <strong>Entities:</strong><br>${entitiesText}
      `;

      Swal.fire({
        title: "WHOIS Information",
        html: info,
        icon: "info",
        confirmButtonText: "OK"
      });
    })
    .catch(err => {
      Swal.fire({
        title: "Error",
        text: `Error: ${err.message}`,
        icon: "error",
        confirmButtonText: "Close"
      });
    });
}


function resolveHostname(ipAddress) {
  function isPrivateIP(ip) {
    const parts = ip.split('.').map(Number);
    return (
      (parts[0] === 10) || 
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || 
      (parts[0] === 192 && parts[1] === 168)
    );
  }

  if (isPrivateIP(ipAddress)) {
    Swal.fire({
      title: "Private IP Address",
      text: "Requests cannot be made for private IP addresses.",
      icon: "info",
      confirmButtonText: "OK"
    });
    return; 
  }

  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'APIKEY': 'w5jJ7NtsHGR2F5DzPbkMA9lmcaMIjlsv'
    },
    body: JSON.stringify({ filter: { ipv4: ipAddress } })
  };

  // TO active https://cors-anywhere.herokuapp.com/corsdemo
  fetch('https://cors-anywhere.herokuapp.com/https://api.securitytrails.com/v1/domains/list?include_ips=false&scroll=false', options)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data.records || data.records.length === 0) {
        throw new Error('No hostnames found.');
      }
      const hostnames = data.records.map(record => record.hostname);
      const hostnamesList = hostnames.map(hostname => `<li>${hostname}</li>`).join('');

      const info = `
        <style>
          ul.table {
            list-style-type: none;
            padding: 0;
            margin: 0;
            width: 100%;
            text-align: center; /* Center text within the list */
          }
          ul.table li {
            display: block; /* Changed to block for centering */
            padding: 8px 0;
          }
          strong {
            display: block; /* Makes strong elements center aligned as block */
            margin-bottom: 10px; /* Adds space below the strong element */
          }
        </style>
        <strong>Hostnames Found:</strong>
        <ul class="table">
          ${hostnamesList}
        </ul>
      `;

      Swal.fire({
        title: "Hostnames Found",
        html: info,
        icon: "success",
        confirmButtonText: "OK"
      });
    })
    .catch(err => {
      Swal.fire({
        title: "Error",
        text: `Error: ${err.message}`,
        icon: "error",
        confirmButtonText: "Close"
      });
    });
}



function getPorts(ip) {
  if (isPrivateIP(ip)) {
    Swal.fire({
      title: "Private IP Address",
      text: "Requests cannot be made for private IP addresses.",
      icon: "info",
      confirmButtonText: "OK"
    });
    return; 
  }

  const apiKey = 'YOUR APIKEY';
  const url = `https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Request error: ${response.status}`);
      return response.json();
    })
    .then(data => {
      const portsData = data.data.map(service => ({
        port: service.port,
        data: service.data || 'No information',
      }));
      displayPortsAndData(portsData);
    })
    .catch(error => displayError(error.message));
}

function displayError(message) {
  Swal.fire({
    title: "Error",
    text: message,
    icon: "error",
    confirmButtonText: "OK"
  });
}

function isPrivateIP(ip) {
  const segments = ip.split('.').map(Number);
  return (
    segments[0] === 10 ||
    (segments[0] === 172 && segments[1] >= 16 && segments[1] <= 31) ||
    (segments[0] === 192 && segments[1] === 168)
  );
}

function displayPortsAndData(data) {
  const portsList = data.map(service => `
    <li style="margin-bottom: 10px; padding: 5px; border: 1px solid #e0e0e0; border-radius: 4px;">
      <strong style="color: #88c0d0;">Port:</strong> ${service.port}<br>
      <strong style="color: #88c0d0;">Data:</strong> ${service.data}
    </li>
  `).join('');

  Swal.fire({
    title: "Ports and Data Information",
    html: `
      <div style="max-height: 300px; overflow-y: auto;">
        <h2 style="margin: 0; padding: 0; font-size: 20px; color: #88c0d0;">Ports and Data Information</h2>
        <ul style="list-style-type: none; padding: 0; margin-top: 10px;">${portsList}</ul>
      </div>
    `,
    icon: "info",
    confirmButtonText: "OK"
  });
}

function getUserAgent(userAgent) {
  const apiUrl = `https://api.apicagent.com/?ua=${encodeURIComponent(userAgent)}`;

  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Error fetching data from the API');
      }
      return response.json();
    })
    .then(data => {
      const info = `
        <style>
          .info-section {
            margin-bottom: 10px;
          }
          .info-section strong {
            display: block;
            font-size: 1.1em;
            color: #88c0d0;
            margin-bottom: 5px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 0.9em;
          }
          .info-table td {
            padding: 6px;
            border-bottom: 1px solid #4C566A;
            color: #D8DEE9;
            vertical-align: top;
          }
          .info-table td.label {
            width: 40%;
            font-weight: bold;
            color: #81a1c1;
            text-align: right;
            padding-right: 10px;
          }
          .info-table td.value {
            width: 60%;
            text-align: left;
          }
          code {
            display: block;
            padding: 8px;
            background-color: #2E3440;
            border-radius: 4px;
            font-size: 0.85em;
            color: #ECEFF4;
          }
        </style>

        <div class="info-section">
          <strong>Client Information</strong>
          <table class="info-table">
            <tr><td class="label">Browser Name:</td><td class="value">${data.client.name}</td></tr>
            <tr><td class="label">Browser Version:</td><td class="value">${data.client.version}</td></tr>
            <tr><td class="label">Browser Engine:</td><td class="value">${data.client.engine}</td></tr>
            <tr><td class="label">Engine Version:</td><td class="value">${data.client.engine_version}</td></tr>
            <tr><td class="label">Browser Type:</td><td class="value">${data.client.type}</td></tr>
          </table>
        </div>

        <div class="info-section">
          <strong>Device Information</strong>
          <table class="info-table">
            <tr><td class="label">Brand:</td><td class="value">${data.device.brand}</td></tr>
            <tr><td class="label">Model:</td><td class="value">${data.device.model}</td></tr>
            <tr><td class="label">Device Type:</td><td class="value">${data.device.type}</td></tr>
          </table>
        </div>

        <div class="info-section">
          <strong>Operating System Information</strong>
          <table class="info-table">
            <tr><td class="label">Operating System Name:</td><td class="value">${data.os.name}</td></tr>
            <tr><td class="label">Platform:</td><td class="value">${data.os.platform}</td></tr>
            <tr><td class="label">Operating System Version:</td><td class="value">${data.os.version}</td></tr>
            <tr><td class="label">Operating System Family:</td><td class="value">${data.os_family}</td></tr>
          </table>
        </div>

        <div class="info-section">
          <strong>User Agent</strong>
          <code>${data.user_agent}</code>
        </div>
      `;

      Swal.fire({
        title: 'Client Information',
        html: info,
        icon: 'info',
        confirmButtonText: 'OK'
      });
    })
    .catch(error => {
      Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
}


function getTimestamp(timestamp) {
  const regex = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}\.\d+) ([+-]\d{2}\d{2}) ([A-Z]+) m=\+([\d.]+)/;
  const match = timestamp.match(regex);

  if (match) {
    const date = match[1]; 
    const time = match[2]; 
    const offset = match[3]; 
    const timezone = match[4]; 
    const duration = match[5]; 

    const info = `
      <style>
        ul.table {
          list-style-type: none;
          padding: 0;
          margin: 0;
          width: 100%;
        }
        ul.table li {
          display: flex;
          padding: 8px 0;
        }
  
        ul.table li strong {
          width: 150px;
          text-align: right;
          margin-right: 10px;
        }
      </style>
     
      <ul class="table">
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Offset:</strong> ${offset}</li>
        <li><strong>Timezone:</strong> ${timezone}</li>
        <li><strong>Duration:</strong> ${duration} seconds</li>
      </ul>
    `;

    Swal.fire({
      title: 'Timestamp Information',
      html: info,
      icon: 'info',
      confirmButtonText: 'OK'
    });
  } else {
    Swal.fire({
      title: 'Error',
      text: 'Invalid timestamp format',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}
