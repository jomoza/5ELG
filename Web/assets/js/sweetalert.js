function showStatusAlert(dealer) {
    Swal.fire({
        title: `Status for ${dealer}`,
        text: 'Something here...',
        icon: 'info',
        confirmButtonText: 'OK'
    });
}

function attachStatusListeners() {
    const statusLinks = document.querySelectorAll('.status-link');
    statusLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
            const dealerName = this.getAttribute('data-dealer');
            showStatusAlert(dealerName);
        });
    });
}

function initStatusListeners() {
    attachStatusListeners();
}


function clearLogById(id) {
    // URL del endpoint con el ID
    const apiUrl = `/api/clear_logs?id=${id}`;

    // Realizar la petición GET al endpoint
    fetch(apiUrl, { method: 'GET' })
        .then(response => {
            if (response.ok) {
                return response.text(); // Obtener la respuesta en formato de texto
            } else {
                throw new Error('Error al eliminar el log');
            }
        })
        .then(result => {
            // Mostrar el resultado de la operación con SweetAlert
            Swal.fire({
                title: 'Log eliminado',
                text: result,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                // Recargar la página después de cerrar la alerta
                window.location.reload();
            });
        })
        .catch(error => {
            // Manejar cualquier error en la petición y mostrar una alerta de error
            Swal.fire({
                title: 'Error',
                text: 'Ocurrió un error al intentar eliminar el log.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        });
}

function clearLogs() {
    Swal.fire({
        title: 'Are you sure?',
        text: 'All data in the database will be deleted!',
        icon: 'warning',
        showCancelButton: true, // Muestra el botón de cancelar
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel!',
        reverseButtons: true // Invierte el orden de los botones
    }).then((result) => {
        if (result.isConfirmed) {
            // Si el usuario confirma, hacer la petición
            fetch('/api/clear_logs', {
                method: 'POST', // Ajusta el método según tu API
            })
            .then(response => {
                if (response.ok) {
                    // Si la respuesta es exitosa
                    Swal.fire({
                        title: 'Success!',
                        text: 'ALL DATA PURGED',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then((result) => {
                        // Recargar la página después de que el usuario confirme
                        if (result.isConfirmed) {
                            window.location.reload(); // Recargar la página
                        }
                    });
                } else {
                    throw new Error('Request failed');
                }
            })
            .catch(error => {
                // Si hay un error en la petición
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to purge data.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            });
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Si el usuario cancela, mostrar un mensaje de cancelación
            Swal.fire({
                title: 'Cancelled',
                text: 'Your data is safe!',
                icon: 'info',
                confirmButtonText: 'OK'
            });
        }
    });
}

function generateCSVLogs() {
    // Realizar una solicitud GET al endpoint para generar el CSV
    fetch('/api/generate_csv_logs', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.text();  // Leer la respuesta como texto
        } else {
            throw new Error('Error generating CSV');
        }
    })
    .then(() => {
        // Mostrar una alerta de éxito usando SweetAlert
        Swal.fire({
            title: 'Success!',
            text: 'Local backup generated successfully.',
            icon: 'success',
            confirmButtonText: 'OK'
        });
    })
    .catch(error => {
        // Mostrar una alerta de error en caso de fallo
        Swal.fire({
            title: 'Error!',
            text: 'Failed to generate local backup.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        console.error('Error generating CSV:', error);
    });
}


function downloadCSV() {
    const url = '/api/csv_all_clients'; // Asegúrate de que el endpoint coincida con tu ruta de API

    fetch(url, {
        method: 'GET',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.blob(); // Obtener el archivo CSV como Blob
    })
    .then(blob => {
        // Crear un enlace de descarga
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'all_clients_log_entries.csv'; // Nombre predeterminado del archivo CSV
        document.body.appendChild(a); 
        a.click(); // Simular el clic para descargar
        a.remove(); // Eliminar el elemento de enlace
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}


function downLogID(id) {
    if (!id) {
        console.error("Debe proporcionar un ID válido.");
        return;
    }

    // Construir la URL del endpoint con el ID proporcionado
    const endpointUrl = `/api/csv_client_info?id=${id}`;

    // Crear un enlace temporal para la descarga del archivo
    const link = document.createElement('a');
    link.href = endpointUrl;

    // El nombre del archivo que se descargará
    link.download = `client_info_${id}.csv`;

    // Agregar el enlace al DOM, hacer clic en él, y luego eliminarlo
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`Descargando CSV para el ID: ${id}`);
}


window.initStatusListeners = initStatusListeners;