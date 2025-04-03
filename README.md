# Temporary_share
a simple fileshare service 簡單文件分享服務

1. 安裝 Node.js 和 npm
```shell
sudo install nodejs npm
```

2. 下載軟件所需要的庫
cd your project file
```shell
npm install express multer path fs uuid archiver dotenv https
```
*背景運行*
```shell
npm install forever
```

3. 檔案結構
```shell
your-project/
             ├── uploads/ (zip file 存储)
             ├── public/index.html
             ├── ssl/fileshare.key
             |   └─/fileshare.pem
             └── server.js
```
5. 運行server.js
```shell
node server.js
```
or
```shell
forever start server.js
```
