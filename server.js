const express = require('express');
const multer = require('multer');
const path = require('path');
const https = require('https');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3210;

app.use(express.static('public'));

// Read SSL certificates *****
const options = {
    key: fs.readFileSync('ssl/fileshare.key'), 
    cert: fs.readFileSync('ssl/fileshare.pem') 
};

//主上傳目錄
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

//初始化主目錄
async function initDirectories() {
  await fs.mkdir(uploadDir, { recursive: true });
}

//動態建立暫存目錄
async function createTempDir() {
  const tempId = uuidv4();
  const tempPath = path.join(__dirname, 'temp', tempId);
  await fs.mkdir(tempPath, { recursive: true });
  return tempPath;
}

//配置multer使用動態暫存目錄
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const tempDir = await createTempDir();
      req.tempUploadDir = tempDir; // 将临时目录附加到请求对象
      cb(null, tempDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 20
  }
});

//初始化主目錄
initDirectories().catch(err => {
  console.error('Failed to initialize directories:', err);
  process.exit(1);
});

//文件上傳處理
app.post('/upload', upload.array('files'), async (req, res) => {
  let tempDir = req.tempUploadDir;
  
  try {
    if (!req.files?.length) {
      throw new Error('No files uploaded');
    }

    // 驗證儲存時間有效性
    let validity = Math.min(parseInt(req.body.validity) || 24, 24);
    
    // 建立ZIP文件
    const zipId = uuidv4();
    const zipFileName = `${zipId}.zip`;
    const zipPath = path.join(uploadDir, zipFileName);
    
    // 創建元數據
    const metadata = {
      originalFiles: req.files.map(file => ({
        originalName: path.basename(file.originalname),
        tempPath: file.path
      })),
      expirationTime: Date.now() + validity * 3600000
    };

    // 建立ZIP存檔
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    
    // 添加文件到ZIP
    for (const file of metadata.originalFiles) {
      archive.file(file.tempPath, { name: file.originalName });
    }

    // 完成打包
    await archive.finalize();
    
    // 儲存元數據
    await fs.writeFile(
      path.join(uploadDir, `${zipId}.json`),
      JSON.stringify(metadata)
    );

    res.json({
      message: 'Files uploaded successfully',
      zipId,
      expires: new Date(metadata.expirationTime).toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during processing' });
  } finally {
    // 成功/失敗清理臨時目錄
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Temp directory cleanup failed:', cleanupError);
      }
    }
  }
});

//下載
app.get('/download/:zipId', async (req, res) => {
    try {
        const zipId = path.basename(req.params.zipId);
        const metadataPath = path.join(uploadDir, `${zipId}.json`);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

        // 檢查檔案是否有效
        if (Date.now() > metadata.expirationTime) {
            await Promise.all([
                fs.unlink(path.join(uploadDir, metadata.zipFileName)),
                fs.unlink(metadataPath)
            ]);
            return res.status(410).json({ message: 'File has expired' });
        }

        res.download(path.join(uploadDir, metadata.zipFileName), `files-${zipId}.zip`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ message: 'File not found' });
        }
        console.error('Download error:', error);
        res.status(500).json({ message: 'Server error during download' });
    }
});

// 刪除過期項目
async function cleanExpiredFiles() {
    try {
        const files = await fs.readdir(uploadDir);
        const cleanupPromises = files.map(async file => {
            if (file.endsWith('.json')) {
                const metadataPath = path.join(uploadDir, file);
                try {
                    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                    if (Date.now() > metadata.expirationTime) {
                        await Promise.all([
                            fs.unlink(path.join(uploadDir, metadata.zipFileName)),
                            fs.unlink(metadataPath)
                        ]);
                        console.log(`Cleaned expired file: ${metadata.zipFileName}`);
                    }
                } catch (error) {
                    console.error('Error processing metadata:', error);
                }
            }
        });
        await Promise.all(cleanupPromises);
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

//  刪除過期項目:15分鐘
setInterval(cleanExpiredFiles, 900000);
cleanExpiredFiles(); // Initial cleanup

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
