# ABOUT DEALERS

In 5ELG, dealers play a crucial role in capturing and processing data from various sources. Dealers are server-side scripts or endpoints designed to receive data from "merca", the client-side JavaScript responsible for gathering environment information. This modular design allows dealers to be versatile, adaptable, and easy to deploy across different scenarios, from web pages to phishing emails or even embedded within office files.

### Key Features of Dealers in 5ELG
- Modular and Language-Agnostic: Dealers in 5ELG can be written in multiple languages (PHP, JSP, ASP, etc.), making it easy to deploy in diverse environments. Each dealer has configuration options, such as SAVER or SENDER, determining whether the data should be saved locally or forwarded to a central 5ELG instance.
- Flexible Data Collection: Dealers are not limited to collecting only browser data. They can also process other data types sent by the "merca" script or other custom sources, such as images, HTML snapshots, or document metadata. Dealers essentially act as the first checkpoint for data collection.
- Real-Time and Batch Processing: Dealers can operate in real-time, sending data immediately to 5ELG’s main server, or in batch mode by storing data in CSV format or other file structures for later upload. This flexibility allows dealers to be used in live tracking scenarios as well as in environments with limited connectivity, where data can be transmitted later.
- Multi-Platform Compatibility: With their lightweight setup, dealers can be integrated into various platforms, including:
    - Web pages: Injected into HTML or JavaScript code, dealers can collect data passively from visiting users.
    - Phishing Campaigns: Integrated within emails, dealers can gather data from users who click on a phishing link or attachment.
    - File-Based Dealers: Embedded in DOCX, PDF, or XLSX files, dealers can be triggered when the file is opened, allowing for covert data collection.
    - Hardware Integrations: Dealers can even work with devices like Raspberry Pi or Flipper Zero, capturing data in physical environments.
- Callback Server Integration: Dealers can leverage 5ELG’s callback server to monitor traffic in real time. This feature is particularly useful for live attack simulations or OSINT research, where dealers collect data on-the-fly and send it directly to the 5ELG dashboard for analysis.

In addition to the traditional web and API scenarios, dealers can also be adapted for:
System Reconnaissance: Collect system information, like OS details or network configurations, when deployed in corporate or lab environments.
Geolocation Tracking: Dealers can process IP-based geolocation data for OSINT, creating more detailed reports.
No-Script Environments: Using <noscript> tags or image tracking pixels, dealers can gather data even when JavaScript is disabled.
With their customizable configurations and extensive compatibility, dealers in 5ELG provide a powerful and flexible solution for data collection, live tracking, and security research.
