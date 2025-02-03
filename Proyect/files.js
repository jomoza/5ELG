const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Define las funciones web dentro del objeto `webfuncs`
const webfuncs = {
    upload: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No se subió ningún archivo.' });
            }
            res.status(200).json({
                message: 'Archivo subido con éxito.',
                file: {
                    originalname: req.file.originalname,
                    filename: req.file.filename,
                    path: req.file.path,
                    size: req.file.size,
                },
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error al subir el archivo.', error: err.message });
        }    
    },
    uploads: async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: 'No se subieron archivos.' });
            }
            const uploadedFiles = req.files.map((file) => ({
                originalname: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
            }));
            res.status(200).json({
                message: 'Archivos subidos con éxito.',
                files: uploadedFiles,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error al subir los archivos.', error: err.message });
        }    
    },
    uploadFromB64: async (req, res) => {
        try {
            const { filebase64, filename, ID } = req.body;
            if (!filebase64 || !filename || !ID) {
                return res.status(400).json({ message: 'Faltan parámetros necesarios.' });
            }

            const uploadPath = process.env.UPLOAD_DIR || 'uploads';
            const dir = path.join(uploadPath, ID);

            // Crear la carpeta de subida si no existe
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const filePath = path.join(dir, filename);
            const fileBuffer = Buffer.from(filebase64, 'base64');

            fs.writeFileSync(filePath, fileBuffer);

            res.status(200).json({
                message: 'Archivo subido con éxito.',
                file: {
                    originalname: filename,
                    path: filePath,
                    size: fileBuffer.length,
                },
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error al subir el archivo desde base64.', error: err.message });
        }
    }
};

router.use('/file', webfuncs.upload);  

router.use('/file64', webfuncs.uploadFromB64);
router.use('/files', webfuncs.uploads);  

module.exports = router;
