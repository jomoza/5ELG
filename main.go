package main

import (
    "flag"
    "bytes"
    "fmt"
    "encoding/csv"
    "io"
    "strconv"
    "io/ioutil"
    "net"
    "net/http"
    "net/url"
    "os"
    "strings"
    "time"
    "encoding/base64"
    "html/template"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "log"
	"encoding/json"    
)

type logs struct {
    ID     int
    Ts     string
    Dl     string
    Ed     []byte
    Er     []byte
    Html   []byte
    Screen []byte
    Ip     string
    Ua     string
    Fu     string
    Fb     string
    Fr     string
    Jd     string
}


// Declare username and password as global variables
var username string
var password string
var host string

type MinimalLog struct {
    ID int    `json:"id"`
    Ip string `json:"ip"`
    Ua string `json:"user_agent"`
    Er string `json:"request_data"`
}


// Estructura del modelo
type Log struct {
    ID uint `gorm:"primaryKey"`
    Fu string
}

// Estructura para la respuesta JSON
type FuCount struct {
    Fu    string `json:"fu"`
    Count int    `json:"count"`
}

// Estructura para representar el resultado de la consulta
type FpCount struct {
	Fb    string `json:"fb"`
	Count int    `json:"count"`
}


// openDB opens the SQLite database connection and handles errors.
// It also configures connection pooling and closes idle connections after usage.
func openDB() *gorm.DB {
    db, err := gorm.Open(sqlite.Open("./Sources/5elg.db"), &gorm.Config{})
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    // Extraer el manejador subyacente de *sql.DB
    sqlDB, err := db.DB()
    if err != nil {
        log.Fatalf("Failed to get database connection: %v", err)
    }

    // Configurar límites para el uso de conexiones
    sqlDB.SetMaxIdleConns(10)      // Número máximo de conexiones inactivas
    sqlDB.SetMaxOpenConns(100)     // Número máximo de conexiones abiertas al mismo tiempo
    sqlDB.SetConnMaxLifetime(0)    // Tiempo máximo de vida de una conexión (0 = sin límite)

    // Aquí no es necesario cerrar la conexión porque el manejo está a nivel global
    return db
}


// parseTemplate parses HTML templates and handles errors.
func parseTemplate(w http.ResponseWriter, tmpl string, data interface{}) {
    t, err := template.ParseFiles(tmpl)
    if err != nil {
        http.Error(w, fmt.Sprintf("Error parsing template: %v", err), http.StatusInternalServerError)
        return
    }
    if err := t.Execute(w, data); err != nil {
        http.Error(w, fmt.Sprintf("Error executing template: %v", err), http.StatusInternalServerError)
    }
}

// authHandler provides basic HTTP authentication middleware
func authHandler(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        user, pass, ok := r.BasicAuth()
        if !ok || user != username || pass != password {
            w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
            w.WriteHeader(http.StatusUnauthorized)
            return
        }
        next(w, r)
    }
}

// readFileSafe reads the file and returns empty content if the file doesn't exist
func readFileSafe(path string) []byte {
    content, err := ioutil.ReadFile(path)
    if os.IsNotExist(err) {
        log.Printf("File %s not found, skipping...", path)
        return []byte{}
    } else if err != nil {
        log.Printf("Error reading file %s: %v", path, err)
        return []byte{}
    }
    return content
}

func sanitizeIP(ipWithPort string) string {
    ip, _, err := net.SplitHostPort(ipWithPort)
    if err != nil {
        // Si no tiene puerto, simplemente devuélvelo como está
        return ipWithPort
    }
    return ip
}

// indexHandler renders the index page with all logs.
func indexHandler(w http.ResponseWriter, r *http.Request) {

    b, err := ioutil.ReadFile("./Web/index.html")
    if err != nil {
        http.Error(w, "No se pudo leer el archivo HTML", http.StatusInternalServerError)
        return
    }

    fmt.Fprint(w, string(b))
}

// indexHandler renders the index page with all logs.
func datadealHandler(w http.ResponseWriter, r *http.Request) {

    b, err := ioutil.ReadFile("./Web/database.html")
    if err != nil {
        http.Error(w, "No se pudo leer el archivo HTML", http.StatusInternalServerError)
        return
    }

    fmt.Fprint(w, string(b))
}

// infoHandler renders the info page with log details.
func infoHandler(w http.ResponseWriter, r *http.Request) {
    id := r.URL.Query().Get("id")
    db := openDB()

    var result logs
    if err := db.Where("id = ?", id).First(&result).Error; err != nil {
        log.Printf("Error querying database: %v", err)
        http.Error(w, "Log not found", http.StatusNotFound)
        return
    }

    cs_data := string(result.Jd)
    ss_data := string(result.Er)

    //ss_data := base64.StdEncoding.EncodeToString(result.Er)

    data := map[string]interface{}{
        "result":   result,
        "cs_data":  cs_data,
        "ss_data":  ss_data,
        "img":      string(readFileSafe("./Sources/screenshotsB64/" + result.Fr + ".shot")),
        "html":     string(readFileSafe("./Sources/screenshotsB64/" + result.Fr + ".code")),
        "pdf_code": string(readFileSafe("./Sources/screenshotsB64/" + result.Fr + ".pdfcode")),
    }
    parseTemplate(w, "Web/info.html", data)
}

// scopeHandler handles file upload and processes CSV data for logs.
func scopeHandler(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    if r.Method == http.MethodGet {
        parseTemplate(w, "./Web/scope.html", nil)
        return
    }

    file, header, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "Failed to retrieve file", http.StatusBadRequest)
        return
    }
    defer file.Close()

    // Save file and process CSV content
    f, err := os.Create("Sources/csv_uploads/" + header.Filename)
    if err != nil {
        http.Error(w, "Failed to save file", http.StatusInternalServerError)
        return
    }
    defer f.Close()
    io.Copy(f, file)

    processCSV(f.Name(), db)
    http.Redirect(w, r, "/scope?msg=Success", http.StatusSeeOther)
}

// processCSV processes the uploaded CSV file to create logs in the database.
func processCSV(filepath string, db *gorm.DB) {
    content, err := ioutil.ReadFile(filepath)
    if err != nil {
        log.Printf("Error reading CSV: %v", err)
        return
    }

    lines := strings.Split(string(content), "\n")
    for _, line := range lines {
        if len(line) == 0 {
            continue
        }

        fields := strings.Split(string(line), ",")
        dealer, ip, ua := fields[0], fields[1], fields[2]
        fpUser, fpBrowser, fpRequest := fields[3], fields[4], fields[5]
        htmlCode, screenCode, jsData := fields[6], fields[7], fields[8]
        encodedData, encodedReq := fields[9], fields[10]

        saveFiles(fpRequest, screenCode, htmlCode)

        newLog := logs{
            Ts:     time.Now().String(),
            Dl:     dealer,
            Ed:     []byte(encodedData),
            Er:     []byte(encodedReq),
            Ip:     ip,
            Ua:     ua,
            Fu:     fpUser,
            Fb:     fpBrowser,
            Fr:     fpRequest,
            Jd:     jsData,
            Html:   []byte(htmlCode),
            Screen: []byte(screenCode),
        }
        db.Create(&newLog)
    }
}

// saveFiles saves base64-encoded HTML and screenshot files.
func saveFiles(requestID, screenCode, htmlCode string) {
    saveFile("./Sources/screenshotsB64/"+requestID+".shot", screenCode)
    saveFile("./Sources/screenshotsB64/"+requestID+".code", htmlCode)
}

// saveFile decodes and saves base64-encoded content to the given file path.
func saveFile(filepath, encodedContent string) {
    file, err := os.Create(filepath)
    if err != nil {
        log.Fatalf("Error creating file: %v", err)
    }
    defer file.Close()
    _, err = file.WriteString(strings.Replace(encodedContent, " ", "", -1))
    if err != nil {
        log.Fatalf("Error writing to file: %v", err)
    }
}

// reciverHandler processes the incoming POST data for logs and saves them.
func reciverHandler(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    dealer, encodedData := r.FormValue("DEALER_NAME"), r.FormValue("encoded_data")
    encodedReq, ip := r.FormValue("encoded_req"), r.FormValue("IP")
    ua, _ := url.QueryUnescape(r.FormValue("UA"))
    fpUser, fpBrowser := r.FormValue("FP_USER"), r.FormValue("FP_BROWSER")
    fpRequest, jsData := r.FormValue("FP_REQUEST"), r.FormValue("JS_DATA")
    htmlCode, screenCode, pdfCode := r.FormValue("HTML_ENCODED"), r.FormValue("SCREEN_ENCODED"), r.FormValue("PDF_SCREEN")

    saveFiles(fpRequest, screenCode, htmlCode)
    saveFile("./Sources/screenshotsB64/"+fpRequest+".pdfcode", pdfCode)

    newLog := logs{
        Ts:     time.Now().String(),
        Dl:     dealer,
        Ed:     []byte(encodedData),
        Er:     []byte(encodedReq),
        Ip:     ip,
        Ua:     ua,
        Fu:     fpUser,
        Fb:     fpBrowser,
        Fr:     fpRequest,
        Jd:     jsData,
        Html:   []byte(htmlCode),
        Screen: []byte(screenCode),
    }
    db.Create(&newLog)

    fmt.Fprintf(w, "Received!")
}


// handleLast7Logs returns the last 7 entries from the logs table as JSON with limited fields
func handleLast7Logs(w http.ResponseWriter, r *http.Request) {
    // Open the database
    db := openDB()

    // Define a slice to hold the logs
    var logs []logs

    // Query the last 7 logs, ordered by ID in descending order
    if err := db.Order("ID desc").Limit(15).Find(&logs).Error; err != nil {
        http.Error(w, fmt.Sprintf("Error retrieving logs: %v", err), http.StatusInternalServerError)
        return
    }

    // Create a slice to hold only the necessary fields
    var minimalLogs []MinimalLog
    for _, log := range logs {
        minimalLogs = append(minimalLogs, MinimalLog{
            ID: log.ID,
            Ip: log.Ip,
            Ua: log.Ua,
            Er: string(log.Er),
        })
    }

    // Set the content type to JSON
    w.Header().Set("Content-Type", "application/json")

    // Encode the minimalLogs slice to JSON and write it to the response
    if err := json.NewEncoder(w).Encode(minimalLogs); err != nil {
        http.Error(w, fmt.Sprintf("Error encoding logs to JSON: %v", err), http.StatusInternalServerError)
    }
}


// backupLogs genera un archivo CSV de la tabla logs.
func backupLogs(db *gorm.DB) error {
    // Crear archivo CSV para backup
    file, err := os.Create("backup_logs.csv")
    if err != nil {
        return fmt.Errorf("Error creando archivo CSV: %v", err)
    }
    defer file.Close()

    // Escribir encabezado CSV
    writer := io.Writer(file)
    _, err = writer.Write([]byte("ID,Ts,Dl,Ed,Er,Html,Screen,Ip,Ua,Fu,Fb,Fr,Jd\n"))
    if err != nil {
        return fmt.Errorf("Error escribiendo encabezado CSV: %v", err)
    }

    // Leer todos los registros de la tabla logs
    var logs []logs
    if err := db.Find(&logs).Error; err != nil {
        return fmt.Errorf("Error obteniendo logs: %v", err)
    }

    // Escribir registros en el archivo CSV
    for _, log := range logs {
        line := fmt.Sprintf("%d,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
            log.ID, log.Ts, log.Dl, string(log.Ed), string(log.Er), string(log.Html), string(log.Screen), log.Ip, log.Ua, log.Fu, log.Fb, log.Fr, log.Jd)
        _, err := writer.Write([]byte(line))
        if err != nil {
            return fmt.Errorf("Error escribiendo registros en CSV: %v", err)
        }
    }

    fmt.Println("Backup generado con éxito en 'backup_logs.csv'.")
    return nil
}

// Función que se puede invocar para hacer backup desde un endpoint HTTP
func handleBackupLogs(w http.ResponseWriter, r *http.Request) {
    db := openDB()
    if err := backupLogs(db); err != nil {
        http.Error(w, fmt.Sprintf("Error en la creación del backup: %v", err), http.StatusInternalServerError)
        return
    }
    fmt.Fprintln(w, "Backup creado con éxito.")
}

// clearLogs elimina registros de la tabla logs. Si se proporciona un ID, elimina solo ese registro.
func clearLogs(db *gorm.DB, id *int) error {
    if id != nil {
        // Eliminar un registro específico por ID
        if err := db.Exec("DELETE FROM logs WHERE id = ?", *id).Error; err != nil {
            return fmt.Errorf("Error eliminando el registro con ID %d: %v", *id, err)
        }
        fmt.Printf("Registro con ID %d ha sido eliminado.\n", *id)
    } else {
        // Eliminar todos los registros si no se proporciona un ID
        if err := db.Exec("DELETE FROM logs").Error; err != nil {
            return fmt.Errorf("Error eliminando todos los registros: %v", err)
        }
        fmt.Println("Todos los registros de la tabla 'logs' han sido eliminados.")
    }
    return nil
}

// Función que maneja la eliminación de logs desde un endpoint HTTP
func handleClearLogs(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    // Obtener el parámetro 'id' de la URL (si existe)
    idParam := r.URL.Query().Get("id")
    var id *int

    if idParam != "" {
        // Si el parámetro 'id' está presente, intentamos convertirlo a entero
        parsedID, err := strconv.Atoi(idParam)
        if err != nil {
            http.Error(w, "ID inválido", http.StatusBadRequest)
            return
        }
        id = &parsedID
    }

    // Llamar a la función clearLogs con el id (nil si no hay id)
    if err := clearLogs(db, id); err != nil {
        http.Error(w, fmt.Sprintf("Error eliminando los logs: %v", err), http.StatusInternalServerError)
        return
    }

    if id != nil {
        fmt.Fprintf(w, "Registro con ID %d ha sido eliminado.\n", *id)
    } else {
        fmt.Fprintln(w, "Todos los registros han sido eliminados.")
    }
}


func dealerHandler(w http.ResponseWriter, r *http.Request) {

    // Si la ruta contiene .png, servir una imagen en lugar de procesar la solicitud
    if strings.HasSuffix(r.URL.Path, ".png") {
        // Abrir el archivo de imagen
        imagePath := "./Sources/ping.png"
        imageFile, err := os.Open(imagePath)
        if err != nil {
            http.Error(w, "Error loading image", http.StatusInternalServerError)
            return
        }
        defer imageFile.Close()

        // Establecer el tipo de contenido como imagen PNG
        w.Header().Set("Content-Type", "image/png")

        // Enviar la imagen al cliente
        http.ServeFile(w, r, imagePath)
        return
    }

    db := openDB()

    // Captura de la IP y User-Agent
    ip := r.RemoteAddr
    userAgent := r.UserAgent()

    // Obtener los parámetros del request
    fpUser := r.FormValue("u")
    fpBrowser := r.FormValue("b")
    fpRequest := r.FormValue("r")
    jsData := r.FormValue("data")
    encodedPage := r.FormValue("code")
    encodedScr := r.FormValue("s")

    // Obtener las cookies
    cookies := make(map[string]string)
    for _, cookie := range r.Cookies() {
        cookies[cookie.Name] = cookie.Value
    }

    
    // Obtener la información de cabeceras y la request, y codificarla en base64
    requestData := map[string]interface{}{
        "headers":     r.Header,
        "cookies":     cookies,
        "requestURL":  r.URL.String(),
        "method":      r.Method,
        "dealer_uri":   r.Header.Get("Origin"),
        "merca_uri":    r.Header.Get("Referer"), 
    }

    encodedReq, _ := json.Marshal(requestData)
    

    // Guardar archivos si es necesario (esto depende de tu lógica)
    saveFile("./Sources/screenshotsB64/"+fpRequest+".shot", encodedScr)
    saveFile("./Sources/screenshotsB64/"+fpRequest+".code", encodedPage)

    rq := base64.StdEncoding.EncodeToString(encodedReq)

    // Crear el nuevo registro en la base de datos
    newLog := logs{
        Ts:     time.Now().String(),
        Dl:     "5ELG.DEALER",
        Ed:     []byte(jsData),
        Er:     []byte(rq),
        Ip:     sanitizeIP(ip),
        Ua:     userAgent,
        Fu:     fpUser,
        Fb:     fpBrowser,
        Fr:     fpRequest,
        Jd:     jsData,
        Html:   []byte(encodedPage),
        Screen: []byte(encodedScr),
    }
    db.Create(&newLog)
}

// Función para enviar los datos mediante POST
func sendData(uri string, data url.Values, w http.ResponseWriter) {
	client := &http.Client{}
	req, err := http.NewRequest("POST", uri, bytes.NewBufferString(data.Encode()))
	if err != nil {
		http.Error(w, "Error creando la request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Basic am9tb3phOmpvbW96YQ==") // Cambiar por tu credencial Base64 de autorización

	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Error enviando la request", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Error leyendo la respuesta", http.StatusInternalServerError)
		return
	}
	w.Write(body)
}

func callbackDashboard(w http.ResponseWriter, r *http.Request) {
    db := openDB()
    var result []logs

    // Ajusta la consulta para filtrar los registros que no tengan valores vacíos
    db.Where("fu != '' AND fb != '' AND ua != '' AND ip != ''").Find(&result)

    // Renderizar la plantilla con los resultados
    parseTemplate(w, "Web/dashboard-logs.html", result)
}

func callbackHandler(w http.ResponseWriter, r *http.Request) {

    b, err := ioutil.ReadFile("./Web/callback-frontend.html")
    if err != nil {
        http.Error(w, "No se pudo leer el archivo HTML", http.StatusInternalServerError)
        return
    }

    fmt.Fprint(w, string(b))

}

func handleDBData(w http.ResponseWriter, r *http.Request) {

    b, err := ioutil.ReadFile("./Web/database-logs.html")
    if err != nil {
        http.Error(w, "No se pudo leer el archivo HTML", http.StatusInternalServerError)
        return
    }

    fmt.Fprint(w, string(b))

}

func merca(w http.ResponseWriter, r *http.Request) {

    b, err := ioutil.ReadFile("./Web/merca.html")
    if err != nil {
        http.Error(w, "No se pudo leer el archivo HTML", http.StatusInternalServerError)
        return
    }

    fmt.Fprint(w, string(b))

}

// handleTotalLogs devuelve el número total de logs en la tabla logs
func handleTotalLogs(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    var count int64
    if err := db.Model(&logs{}).Count(&count).Error; err != nil {
        http.Error(w, fmt.Sprintf("Error al contar los logs: %v", err), http.StatusInternalServerError)
        return
    }

    jsonResponse := map[string]int64{"total_logs": count}
    json.NewEncoder(w).Encode(jsonResponse)
}

// handleLogsByDealer devuelve el número de logs agrupados por dealer
func handleLogsByDealer(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    var results []struct {
        Dealer string
        Count  int64
    }

    if err := db.Table("logs").Select("Dl as dealer, COUNT(*) as count").Group("Dl").Scan(&results).Error; err != nil {
        http.Error(w, fmt.Sprintf("Error al obtener los logs por dealer: %v", err), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(results)
}

// handleLogsByIP devuelve el número de logs agrupados por IP
func handleLogsByIP(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    var results []struct {
        IP    string
        Count int64
    }

    if err := db.Table("logs").Select("Ip as ip, COUNT(*) as count").Group("Ip").Scan(&results).Error; err != nil {
        http.Error(w, fmt.Sprintf("Error al obtener los logs por IP: %v", err), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(results)
}
// handleLogsByDay devuelve el número de logs agrupados por día
func handleLogsByDay(w http.ResponseWriter, r *http.Request) {
    db := openDB() // Utiliza la función openDB para obtener la conexión a la base de datos

    // Estructura para almacenar los resultados
    var results []struct {
        Fb    string
        Count int
    }

    // Realiza la consulta utilizando GORM
    if err := db.Raw(`
        SELECT Fb, COUNT(*) as count 
        FROM logs 
        GROUP BY Fb 
        ORDER BY count DESC
    `).Scan(&results).Error; err != nil {
        http.Error(w, "Error en la consulta de la base de datos", http.StatusInternalServerError)
        return
    }

    // Convierte el resultado a JSON y lo envía al cliente
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(results); err != nil {
        http.Error(w, "Error al codificar JSON", http.StatusInternalServerError)
    }
}

// handleLogsByHour devuelve la distribución de logs por hora del día
func handleLogsByHour(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    var fuCounts []FuCount
    // Consulta SQL para agrupar por Fu y contar el número de entradas
    db.Model(&Log{}).Select("fu, count(fu) as count").Group("fu").Scan(&fuCounts)

    // Convertir la respuesta a JSON
    jsonResponse, err := json.Marshal(fuCounts)
    if err != nil {
        http.Error(w, "Error generating JSON", http.StatusInternalServerError)
        return
    }

    // Escribir la respuesta JSON
    w.Header().Set("Content-Type", "application/json")
    w.Write(jsonResponse)    
}


// countDlEntries cuenta cuántos valores únicos de "Dl" hay y cuántas entradas tiene cada uno.
func countDlEntries(db *gorm.DB) (map[string]int, error) {
    // Crear un mapa para almacenar los resultados
    dlCounts := make(map[string]int)

    // Realizar la consulta SQL de agregación
    rows, err := db.Table("logs").Select("Dl, COUNT(*) as count").Group("Dl").Rows()
    if err != nil {
        return nil, fmt.Errorf("Error al contar entradas por 'Dl': %v", err)
    }
    defer rows.Close()

    // Recorrer los resultados y almacenarlos en el mapa
    for rows.Next() {
        var dl string
        var count int
        if err := rows.Scan(&dl, &count); err != nil {
            return nil, fmt.Errorf("Error al leer los resultados: %v", err)
        }
        dlCounts[dl] = count
    }

    return dlCounts, nil
}

// handleCountDlEntries devuelve el conteo de entradas por 'Dl' en formato JSON.
func handleCountDlEntries(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    dlCounts, err := countDlEntries(db)
    if err != nil {
        http.Error(w, fmt.Sprintf("Error contando entradas: %v", err), http.StatusInternalServerError)
        return
    }

    // Configurar el encabezado de la respuesta como JSON
    w.Header().Set("Content-Type", "application/json")
    // Convertir el mapa a JSON
    jsonResponse, err := json.Marshal(dlCounts)
    if err != nil {
        http.Error(w, fmt.Sprintf("Error al generar JSON: %v", err), http.StatusInternalServerError)
        return
    }
    // Enviar el JSON como respuesta
    w.Write(jsonResponse)
}

// generateCSVForFu genera un CSV para un campo "Fu" específico de la tabla logs.
func generateCSVForFu(db *gorm.DB, fu string) (string, error) {
    var logEntries []logs

    // Buscar las entradas por el campo "Fu"
    if err := db.Where("fu = ?", fu).Find(&logEntries).Error; err != nil {
        return "", fmt.Errorf("Error al buscar el campo Fu: %v", err)
    }

    if len(logEntries) == 0 {
        return "", fmt.Errorf("No entries found for Fu: %s", fu)
    }

    // Crear un buffer para almacenar el CSV
    var csvBuffer bytes.Buffer
    writer := csv.NewWriter(&csvBuffer)

    // Escribir el encabezado del CSV
    writer.Write([]string{"ID", "Timestamp", "Dealer", "Encoded Data", "Encoded Request", "HTML", "Screen", "IP", "User Agent", "User Fingerprint", "Browser Fingerprint", "Request ID", "JS Data"})

    // Escribir las filas con los datos de las entradas encontradas
    for _, logEntry := range logEntries {
        writer.Write([]string{
            fmt.Sprintf("%d", logEntry.ID),
            logEntry.Ts,
            logEntry.Dl,
            string(logEntry.Ed),
            string(logEntry.Er),
            string(logEntry.Html),
            string(logEntry.Screen),
            logEntry.Ip,
            logEntry.Ua,
            logEntry.Fu,
            logEntry.Fb,
            logEntry.Fr,
            logEntry.Jd,
        })
    }

    // Asegurarse de que el contenido se escriba correctamente en el buffer
    writer.Flush()
    if err := writer.Error(); err != nil {
        return "", fmt.Errorf("Error al escribir el CSV: %v", err)
    }

    // Devolver el contenido del CSV como una cadena
    return csvBuffer.String(), nil
}

// generateCSVForAllClients genera el CSV de todos los registros de clientes en la base de datos.
func generateCSVForAllClients(db *gorm.DB) (string, error) {
    var logEntries []logs // Suponiendo que "logs" es el modelo de tus registros

    // Obtener todos los registros de la base de datos
    if err := db.Find(&logEntries).Error; err != nil {
        return "", fmt.Errorf("error al obtener los registros: %v", err)
    }

    // Crear un buffer para almacenar los datos CSV
    var csvData strings.Builder
    writer := csv.NewWriter(&csvData)

    // Escribir encabezado del CSV (ajusta los nombres de las columnas según tu modelo)
    writer.Write([]string{"ID", "Timestamp", "IP", "User Agent", "Fu", "Fb", "Request Data"})

    // Escribir los registros en el CSV
    for _, entry := range logEntries {
        writer.Write([]string{
            fmt.Sprintf("%d", entry.ID),
            entry.Ts,
            entry.Ip,
            entry.Ua,
            entry.Fu,
            entry.Fb,
            entry.Fr, // Ajusta según los campos que quieras incluir
        })
    }

    // Asegurarse de que todos los datos se escriban
    writer.Flush()

    // Verificar si hubo algún error en la escritura
    if err := writer.Error(); err != nil {
        return "", fmt.Errorf("error al escribir el CSV: %v", err)
    }

    return csvData.String(), nil
}


// handleCSVForAllClients maneja la solicitud web para devolver el CSV de todos los clientes.
func handleCSVForAllClients(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    // Generar el CSV para todos los registros
    csvData, err := generateCSVForAllClients(db)
    if err != nil {
        http.Error(w, fmt.Sprintf("Error al generar el CSV: %v", err), http.StatusInternalServerError)
        return
    }

    // Configurar el encabezado de la respuesta para descargar el CSV
    w.Header().Set("Content-Type", "text/csv")
    w.Header().Set("Content-Disposition", "attachment; filename=all_clients_log_entries.csv")

    // Enviar el CSV como respuesta
    w.Write([]byte(csvData))
}


// handleJSONForFu maneja la solicitud web para devolver los datos de un "Fu" concreto en formato JSON.
func handleJSONForFu(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    // Obtener el campo "Fu" de la consulta
    fu := r.URL.Query().Get("fu")
    if fu == "" {
        http.Error(w, "Fu is required", http.StatusBadRequest)
        return
    }

    // Consultar la base de datos para obtener las entradas de un "Fu" concreto
    var logsForFu []logs
    if err := db.Where("fu = ?", fu).Find(&logsForFu).Error; err != nil {
        http.Error(w, fmt.Sprintf("Error fetching logs for Fu: %v", err), http.StatusInternalServerError)
        return
    }

    // Si no hay entradas encontradas
    if len(logsForFu) == 0 {
        http.Error(w, "No entries found for the given Fu", http.StatusNotFound)
        return
    }

    // Convertir las entradas a formato JSON
    jsonData, err := json.Marshal(logsForFu)
    if err != nil {
        http.Error(w, fmt.Sprintf("Error generating JSON: %v", err), http.StatusInternalServerError)
        return
    }

    // Configurar el encabezado de la respuesta como JSON
    w.Header().Set("Content-Type", "application/json")

    // Enviar los datos JSON como respuesta
    w.Write(jsonData)
}


// generateCSVForID genera un CSV para un ID específico de la tabla logs.
func generateCSVForID(db *gorm.DB, id string) (string, error) {
    var logEntry logs

    // Buscar la entrada por el ID
    if err := db.Where("id = ?", id).First(&logEntry).Error; err != nil {
        return "", fmt.Errorf("Error al buscar el ID: %v", err)
    }

    // Crear un buffer para almacenar el CSV
    var csvBuffer bytes.Buffer
    writer := csv.NewWriter(&csvBuffer)

    // Escribir el encabezado del CSV
    writer.Write([]string{"ID", "Timestamp", "Dealer", "Encoded Data", "Encoded Request", "HTML", "Screen", "IP", "User Agent", "User Fingerprint", "Browser Fingerprint", "Request ID", "JS Data"})

    // Escribir la fila con los datos de la entrada
    writer.Write([]string{
        fmt.Sprintf("%d", logEntry.ID),
        logEntry.Ts,
        logEntry.Dl,
        string(logEntry.Ed),
        string(logEntry.Er),
        string(logEntry.Html),
        string(logEntry.Screen),
        logEntry.Ip,
        logEntry.Ua,
        logEntry.Fu,
        logEntry.Fb,
        logEntry.Fr,
        logEntry.Jd,
    })

    // Asegurarse de que el contenido se escriba correctamente en el buffer
    writer.Flush()
    if err := writer.Error(); err != nil {
        return "", fmt.Errorf("Error al escribir el CSV: %v", err)
    }

    // Devolver el contenido del CSV como una cadena
    return csvBuffer.String(), nil
}

// handleCSVForID maneja la solicitud web para devolver el CSV de un ID concreto.
func handleCSVForID(w http.ResponseWriter, r *http.Request) {
    db := openDB()

    // Obtener el ID de la consulta
    id := r.URL.Query().Get("id")
    if id == "" {
        http.Error(w, "ID is required", http.StatusBadRequest)
        return
    }

    // Generar el CSV para el ID
    csvData, err := generateCSVForID(db, id)
    if err != nil {
        http.Error(w, fmt.Sprintf("Error al generar el CSV: %v", err), http.StatusInternalServerError)
        return
    }

    // Configurar el encabezado de la respuesta para descargar el CSV
    w.Header().Set("Content-Type", "text/csv")
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=log_entry_%s.csv", id))

    // Enviar el CSV como respuesta
    w.Write([]byte(csvData))
}

// Middleware to handle CORS
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*") // Allow all origins
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE") // Allow HTTP methods
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization") // Allow specific headers
        w.Header().Set("Access-Control-Allow-Credentials", "true") // Allow credentials if needed

        // If it's an OPTIONS request (pre-flight), return immediately
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusOK)
            return
        }

        next.ServeHTTP(w, r)
    })
}


// Setup and serve HTTP or HTTPS based on flags.
func main() {
    host := flag.String("host", "localhost", "The host for the server")
    port := flag.String("port", "8888", "The port for the server")
    ssl := flag.Bool("ssl", false, "Enable SSL for HTTPS server")

    // Initialize authentication credentials
    flag.StringVar(&username, "user", "default", "Username for basic authentication")
    flag.StringVar(&password, "password", "password", "Password for basic authentication")

    flag.Parse()

    // API endpoints
    mux := http.NewServeMux()

    mux.HandleFunc("/", authHandler(indexHandler))
    mux.HandleFunc("/info", authHandler(infoHandler))
    mux.HandleFunc("/scope", authHandler(scopeHandler))
    mux.HandleFunc("/callback-server", authHandler(callbackHandler))
    mux.HandleFunc("/dashboard-logs", authHandler(callbackDashboard))
    mux.HandleFunc("/data-dealers", authHandler(datadealHandler))
    mux.HandleFunc("/data-logs", authHandler(handleDBData))

    //mux.HandleFunc("/generator", authHandler(reciverHandler))

    mux.HandleFunc("/reciver", reciverHandler)
    mux.HandleFunc("/dealer", dealerHandler)
    mux.HandleFunc("/dealer.png", dealerHandler)

    mux.HandleFunc("/merca", merca)


    fs := http.FileServer(http.Dir("./Web/assets/"))
    mux.Handle("/assets/", http.StripPrefix("/assets/", fs))

    // API endpoints for logs and data handling
    mux.HandleFunc("/api/generate_csv_logs", authHandler(handleBackupLogs));
    mux.HandleFunc("/api/clear_logs", authHandler(handleClearLogs));
    mux.HandleFunc("/api/count_dealers", authHandler(handleCountDlEntries));
    mux.HandleFunc("/api/csv_client_info", authHandler(handleCSVForID));
    mux.HandleFunc("/api/csv_all_clients", authHandler(handleCSVForAllClients));
    mux.HandleFunc("/api/get_clientF_info", authHandler(handleJSONForFu));
    mux.HandleFunc("/api/last7logs", authHandler(handleLast7Logs));
    mux.HandleFunc("/api/logs/total", authHandler(handleTotalLogs));
    mux.HandleFunc("/api/logs/dealers", authHandler(handleLogsByDealer));
    mux.HandleFunc("/api/logs/ip", authHandler(handleLogsByIP));
    mux.HandleFunc("/api/logs/fpus", authHandler(handleLogsByDay));
    mux.HandleFunc("/api/logs/fus", authHandler(handleLogsByHour));
    //mux.HandleFunc("/api/logs/user-agent-count", authHandler(handleUserAgentWithMoreThan))
    

    // Apply CORS middleware to all routes
    handler := corsMiddleware(mux)

    serverAddress := fmt.Sprintf("%s:%s", *host, *port)
    
    fmt.Printf("\n5ELG - BROWSER DISTRIBUTED FINGERPRINTER\nRUNNING SERVER -> %s\n", serverAddress)

    if *ssl {
        err := http.ListenAndServeTLS(serverAddress, "cert.pem", "key.pem", handler)
        if err != nil {
            log.Fatalf("Error starting HTTPS server: %v", err)
        }
    } else {
        err := http.ListenAndServe(serverAddress, handler)
        if err != nil {
            log.Fatalf("Error starting HTTP server: %v", err)
        }
    }
}
