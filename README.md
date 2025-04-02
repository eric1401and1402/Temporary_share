# smaill-fileshare
1. 安裝 Node.js 和 npm
sudo install nodejs npm

2. 下載軟件所需要的庫
cd your project file
npm install express multer path fs uuid archiver dotenv https (forever)

3. 檔案結構
your-project/
             ├── temp/ 
             ├── uploads/ (zip file 存储)
             ├── public/index.html
             ├── ssl/fileshare.key
             |      /fileshare.pem
             └── server.js
4. 運行server.js
node server.js  or  (forever start server.js)
