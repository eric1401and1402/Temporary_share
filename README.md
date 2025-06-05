# Temporary_share
a simple fileshare service 簡單文件分享服務

1. 安裝 Node.js 和 npm
```shell
sudo apt install nodejs npm
```
node 版本要above 18
```shell
nodejs -v
```
```shell
npm -v
```
or 
```shell
# Download and install fnm:
curl -o- https://fnm.vercel.app/install | bash

# Download and install Node.js:
fnm install 22

# Verify the Node.js version:
node -v # Should print "v22.16.0".

# Verify npm version:
npm -v # Should print "10.9.2".
```
2. 下載軟件所需要的庫
 ```shell
cd your project file
```
```shell
npm install express multer path fs uuid archiver dotenv https uuid
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
                  └─/fileshare.css
                  └─/fileshare.js
             ├── ssl/fileshare.key
                 └─/fileshare.pem
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
