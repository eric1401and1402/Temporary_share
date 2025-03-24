const express = require('express');
const multer = require('multer');
const path = require('path');
const https = require('https');
const fs = require('fs');
const archiver = require('archiver');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3210;

app.use(express.static('public'));

// Read SSL certificates
const options = {
    key: fs.readFileSync('ssl/fileshare.key'),
    cert: fs.readFileSync('ssl/fileshare.pem')
};

// Ensure the uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir); // Create the directory if it doesn't exist
}

// Configure multer (no file type restriction)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save files in "uploads" folder
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Save files with original names
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 150 * 1024 * 1024 } // Optional: Limit file size to 150MB
});

// Multiple file upload
app.post('/upload', upload.array('files', 20), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    const validity = parseInt(req.body.validity); // Get validity time (hours)
	if (validity > 24) {
				let validity = 24;
				return res.status(400).json({ message: 'Validity time cannot exceed 24 hours.' });
				}
    const expirationTime = Date.now() + validity * 60 * 60 * 1000; // Calculate expiration time

    // Create a zip file
    const zipFileName = `${Date.now() * Math.ceil(Math.random()*10)}-files.zip`;
    const zipFilePath = path.join(uploadDir, zipFileName);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add each uploaded file to the zip archive
    req.files.forEach(file => {
        archive.file(file.path, { name: file.originalname });
    });

    // Finalize the archive (no more files to add)
    archive.finalize();

    // Listen for the close event to respond to the client
    output.on('close', () => {
        // Delete the original files after zipping
        req.files.forEach(file => {
            fs.unlinkSync(file.path);
        });

        // Save expiration time
        fs.writeFileSync(path.join(uploadDir, `${zipFileName}.json`), JSON.stringify({ expirationTime }));

        // Respond with success and the zip file name
        res.json({
            message: 'Files uploaded and zipped successfully',
            zipFileName: zipFileName
        });
    });

    // Handle archive errors
    archive.on('error', (err) => {
        return res.status(500).json({
            message: 'Error creating zip file',
            error: err.message
        });
    });
});

// File download route
app.get('/download/:filename', (req, res) => {
    const filename = path.basename(req.params.filename); // Prevent directory traversal
    const fileLocation = path.join(uploadDir, filename);
    const expirationFile = path.join(uploadDir, `${filename}.json`);

    // Check if the file exists
    fs.access(fileLocation, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`File not found: ${filename}`);
            return res.status(404).json({ message: 'File not found' });
        }

        // Check expiration time
        if (fs.existsSync(expirationFile)) {
            const { expirationTime } = JSON.parse(fs.readFileSync(expirationFile));
            if (Date.now() > expirationTime) {
                // Delete expired file and its metadata
                fs.unlinkSync(fileLocation);
                fs.unlinkSync(expirationFile);
                return res.status(403).json({ message: 'File has expired and has been deleted' });
            }
        }

        res.download(fileLocation, filename);
    });
});

// Function to delete expired files
function deleteExpiredFiles() {
    fs.readdir(uploadDir, (err, files) => {
        if (err) throw err;

        files.forEach(file => {
            const expirationFile = path.join(uploadDir, `${file}.json`);
            if (fs.existsSync(expirationFile)) {
                const { expirationTime } = JSON.parse(fs.readFileSync(expirationFile));
                if (Date.now() > expirationTime) {
                    // Delete the expired file and its metadata
                    fs.unlinkSync(path.join(uploadDir, file));
                    fs.unlinkSync(expirationFile);
                    console.log(`Deleted expired file: ${file}`);
                }
            }
        });
    });
}

// Set an interval to check for expired files every hour
setInterval(deleteExpiredFiles, 30 * 60 * 1000); // Check every half hour

// Start HTTPS server
https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS Server running at https://localhost:${PORT}`);
});
