const express = require('express');
const multer = require('multer');
const path = require('path');
const https = require('https');
const fs = require('fs');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3210;

// Generate a UUID in 4-4-4 format (e.g., abcd-efgh-ijkl)
const generateShortUUID = () => {
    return uuidv4().replace(/-/g, '').match(/.{1,4}/g).slice(0, 3).join('-');
};

// Serve static files from the "public" directory
app.use(express.static('public'));

// SSL certificate configuration
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync('ssl/fileshare.key'),
        cert: fs.readFileSync('ssl/fileshare.pem')
    };
} catch (err) {
    console.error('Failed to load SSL certificates:', err.message);
    process.exit(1);
}

// Ensure the upload directory exists
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const ensureUploadDirExists = async () => {
    try {
        await fs.promises.mkdir(uploadDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create upload directory:', err.message);
        process.exit(1);
    }
};
ensureUploadDirExists();

// Cleanup leftover temporary directories
const cleanupTempDirectories = async () => {
    try {
        const tempDirs = (await fs.promises.readdir(uploadDir)).filter(dir => dir.startsWith('temp-'));
        for (const tempDir of tempDirs) {
            const tempDirPath = path.join(uploadDir, tempDir);
            await fs.promises.rm(tempDirPath, { recursive: true, force: true });
            console.log(`Cleaned up leftover temp directory: ${tempDir}`);
        }
    } catch (err) {
        console.error('Error cleaning up temp directories:', err.message);
    }
};
cleanupTempDirectories();
setInterval(cleanupTempDirectories, 60 * 60 * 1000); // Every hour

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!req.tempDir) {
            req.tempDir = path.join(uploadDir, `temp-${generateShortUUID()}`);
            fs.promises.mkdir(req.tempDir, { recursive: true }).then(() => cb(null, req.tempDir)).catch(cb);
        } else {
            cb(null, req.tempDir);
        }
    },
    filename: (req, file, cb) => {
        cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // Limit file size to 100MB
});

// Handle file uploads
app.post('/upload', upload.array('files', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        // Validate and process the validity parameter
        let validity = Math.min(Math.max(parseInt(req.body.validity, 10) || 0, 1), 24); // Between 1 and 24 hours
        if (!validity) {
            return res.status(400).json({ message: 'Invalid validity time' });
        }
        const expirationTime = Date.now() + validity * 60 * 60 * 1000;

        // Generate a unique ZIP file name
        const zipFileName = `${generateShortUUID()}.zip`;
        const zipFilePath = path.join(uploadDir, zipFileName);
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 6 } });

        // Handle archive events
        output.on('close', async () => {
            // Delete temporary directory
            if (req.tempDir) {
                await fs.promises.rm(req.tempDir, { recursive: true, force: true });
            }

            // Save expiration metadata
            await fs.promises.writeFile(
                path.join(uploadDir, `${zipFileName}.json`),
                JSON.stringify({ expirationTime })
            );

            res.json({
                message: '文件上傳成功',
                zipFileName: zipFileName
            });
        });

        archive.on('error', async (err) => {
            // Cleanup in case of error
            if (req.tempDir) {
                await fs.promises.rm(req.tempDir, { recursive: true, force: true });
            }
            console.error('Error creating zip file:', err.message);
            res.status(500).json({ message: 'Error creating zip file', error: err.message });
        });

        output.on('error', async (err) => {
            // Handle output stream errors
            if (req.tempDir) {
                await fs.promises.rm(req.tempDir, { recursive: true, force: true });
            }
            console.error('Error writing zip file:', err.message);
            res.status(500).json({ message: 'Error writing zip file', error: err.message });
        });

        archive.pipe(output);

        // Add files to the ZIP archive
        req.files.forEach(file => {
            archive.file(file.path, { name: file.originalname });
        });

        await archive.finalize();
    } catch (err) {
        console.error('Error during file upload:', err.message);
        res.status(500).json({ message: 'Unexpected server error', error: err.message });
    }
});

// File download endpoint
app.get('/download/:filename', async (req, res) => {
    try {
        const filename = path.basename(req.params.filename);
        const fileLocation = path.join(uploadDir, filename);
        const expirationFile = path.join(uploadDir, `${filename}.json`);

        await fs.promises.access(fileLocation, fs.constants.F_OK);

        if (await fs.promises.access(expirationFile).then(() => true).catch(() => false)) {
            const { expirationTime } = JSON.parse(await fs.promises.readFile(expirationFile, 'utf-8'));
            if (Date.now() > expirationTime) {
                await Promise.all([
                    fs.promises.unlink(fileLocation),
                    fs.promises.unlink(expirationFile)
                ]);
                return res.status(410).json({ message: '分享檔案已過期' });
            }
        }

        res.download(fileLocation, filename);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ message: '分享檔案已過期/沒有這檔案' });
        }
        console.error('Error during file download:', err.message);
        res.status(500).json({ message: 'Unexpected server error', error: err.message });
    }
});

// Cleanup expired files
const deleteExpiredFiles = async () => {
    try {
        const files = await fs.promises.readdir(uploadDir);
        for (const file of files) {
            if (file.endsWith('.zip')) {
                const expirationFile = path.join(uploadDir, `${file}.json`);
                if (await fs.promises.access(expirationFile).then(() => true).catch(() => false)) {
                    const { expirationTime } = JSON.parse(await fs.promises.readFile(expirationFile, 'utf-8'));
                    if (Date.now() > expirationTime) {
                        await Promise.all([
                            fs.promises.unlink(path.join(uploadDir, file)),
                            fs.promises.unlink(expirationFile)
                        ]);
                        console.log(`Deleted expired file: ${file}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error during expired file cleanup:', err.message);
    }
};
setInterval(deleteExpiredFiles, 30 * 60 * 1000); // Every 30 minutes

// Start HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});
