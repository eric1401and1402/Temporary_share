// 頁籤切換功能
        document.querySelectorAll('.tablink').forEach(button => {
            button.addEventListener('click', () => {
                // 移除所有active類別
                document.querySelectorAll('.tablink').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tabcontent').forEach(tab => tab.classList.remove('active'));
                
                // 添加active類別到點擊的頁籤
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // 文件拖放功能
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');
        
        dropArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropArea.classList.add('dragover');
        }
        
        function unhighlight() {
            dropArea.classList.remove('dragover');
        }
        
        dropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }
        
        fileInput.addEventListener('change', function() {
            handleFiles(this.files);
        });
        
        // 處理選取的文件
        function handleFiles(files) {
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';
            
            if (files.length === 0) {
                fileList.innerHTML = '<div class="file-item"><div class="file-name">尚未選擇檔案</div></div>';
                return;
            }
            
            // 檢查文件總大小
            let totalSize = 0;
            for (let i = 0; i < files.length; i++) {
                totalSize += files[i].size;
            }
            
            if (totalSize > 100 * 1024 * 1024) { // 100MB
                showPopup('檔案總大小超過100MB限制', 'error');
                return;
            }
            
	    let maxFiles = 20; // 最大檔案數量
		if (files.length > maxFiles) {
        	showPopup('錯誤：最多只能上傳20個檔案' , 'error');
        	return;
    		}

            // 顯示文件列表
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                
                const fileName = document.createElement('div');
                fileName.className = 'file-name';
                fileName.textContent = file.name;
                
                const fileSize = document.createElement('div');
                fileSize.className = 'file-size';
                fileSize.textContent = formatFileSize(file.size);
                
                fileItem.appendChild(fileName);
                fileItem.appendChild(fileSize);
                fileList.appendChild(fileItem);
            }
        }
        
        // 格式化文件大小
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // 顯示彈出訊息
        function showPopup(message, type = 'info', duration = 4000) {
            const container = document.getElementById('popup-container');
            const popup = document.createElement('div');
            popup.className = `popup ${type}`;
            
            let icon = '<i class="fas fa-info-circle"></i>';
            if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
            if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
            
            popup.innerHTML = `${icon}${message}`;
            container.appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, duration);
        }
        //處理文件上傳
	document.getElementById('uploadButton').addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            const validity = document.getElementById('validity').value;
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            if (fileInput.files.length === 0) {
                showPopup('請先選擇要上傳的檔案', 'error');
                return;
            }
            
            if (!validity || validity < 1 || validity > 24) {
                showPopup('請輸入有效的時限 (1-24小時)', 'error');
                return;
            }
            
            // 創建FormData對象
            const formData = new FormData();
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('files', fileInput.files[i]);
            }
            formData.append('validity', validity);
            
            // 創建XMLHttpRequest對象
            const xhr = new XMLHttpRequest();
            
            // 配置上傳進度事件監聽
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentCompleted = Math.round((event.loaded * 100) / event.total);
                    progressBar.style.width = `${percentCompleted}%`;
                    progressText.textContent = `${percentCompleted}%`;
                    
                    // 特殊處理99%的情況（瀏覽器有時不會達到100%）
                    if (percentCompleted === 99) {
                        progressBar.style.width = '100%';
                        progressText.textContent = '100%';
                    }
                }
            });
            
            // 請求完成事件
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        
                        // 確保進度顯示100%
                        progressBar.style.width = '100%';
                        progressText.textContent = '100%';
                        
                        showPopup('檔案上傳成功！', 'success');
                        
                        // 顯示檔案編號
			
                        document.getElementById('fileId').textContent = data.zipFileName;
                        document.getElementById('uploadedInfo').style.display = 'block';
                 		
                        // 複製檔案編號到剪貼簿
                        navigator.clipboard.writeText(data.zipFileName).then(() => {
                            setTimeout(() => {
                                showPopup('檔案編號已複製到剪貼簿', 'info');
                            }, 2000);

			//重設進度顯示
			progressBar.style.width = '0%';
                        progressText.textContent = '0%';

                        });
                    } catch (e) {
                        showPopup('解析伺服器響應失敗', 'error');
                        console.error('解析錯誤:', e);
                    }
                } else {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        showPopup(`上傳失敗: ${errorData.message}`, 'error');
                    } catch (e) {
                        showPopup(`上傳失敗: 伺服器錯誤 (${xhr.status})`, 'error');
                    }
                }
            });
            
            // 錯誤處理
            xhr.addEventListener('error', () => {
                showPopup('上傳過程中發生網路錯誤', 'error');
            });
            
            // 請求逾時處理
            xhr.addEventListener('timeout', () => {
                showPopup('上傳請求逾時，請重試', 'error');
            });
            
            // 中止請求處理
            xhr.addEventListener('abort', () => {
                showPopup('上傳已中止', 'info');
            });
            
            // 開啟請求
            xhr.open('POST', '/upload');
            
            // 設定逾時時間（60秒）
            xhr.timeout = 60000;
            
            // 發送請求
            xhr.send(formData);
            
            // 顯示開始上傳訊息
            showPopup('開始上傳檔案...', 'info');
        });
        
        // 處理文件下載
        document.getElementById('downloadButton').addEventListener('click', async () => {
            const fileCode = document.getElementById('fileCode').value.trim();
            const downloadProgressBar = document.getElementById('downloadProgressBar');
            const downloadProgressText = document.getElementById('downloadProgressText');
            
            if (!fileCode) {
                showPopup('請輸入檔案編號', 'error');
                return;
            }
            
            if (!/^[a-zA-Z0-9-]+\.zip$/.test(fileCode)) {
                showPopup('檔案編號格式不正確', 'error');
                return;
            }
            
            try {
                // 開始下載
                downloadProgressText.textContent = '開始下載...';
                
                // 模擬下載進度
                let downloadProgress = 0;
                const downloadInterval = setInterval(() => {
                    downloadProgress += Math.floor(Math.random() * 15);
                    if (downloadProgress >= 100) {
                        clearInterval(downloadInterval);
                    }
                    downloadProgressBar.style.width = `${downloadProgress}%`;
                    downloadProgressText.textContent = `${downloadProgress}%`;
                }, 200);
                
                // 發送API請求
                const response = await fetch(`/download/${fileCode}`);
                
                if (response.ok) {
                    // 獲取Blob對象
                    const blob = await response.blob();
                    
                    // 創建下載鏈接
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileCode;
                    document.body.appendChild(a);
                    a.click();
                    
                    // 清理
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    clearInterval(downloadInterval);
                    downloadProgressBar.style.width = '100%';
                    downloadProgressText.textContent = '下載完成！';
                    
                    // 顯示下載成功訊息
                    showPopup('檔案下載成功！', 'success');
                } else {
                    const errorData = await response.json();
                    clearInterval(downloadInterval);
                    showPopup(`下載失敗: ${errorData.message}`, 'error');
                }
            } catch (error) {
                showPopup('下載過程中發生錯誤', 'error');
                console.error('下載錯誤:', error);
            }
        });
        
        // 生成檔案ID
        function generateFileId() {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let id = '';
            
            for (let i = 0; i < 4; i++) {
                if (i > 0) id += '-';
                for (let j = 0; j < 4; j++) {
                    id += chars.charAt(Math.floor(Math.random() * chars.length));
                }
            }
            
            return id + '.zip';
        }
        
        // 初始化頁面
        document.addEventListener('DOMContentLoaded', () => {
            // 顯示歡迎訊息
            setTimeout(() => {
                showPopup('歡迎使用檔案分享系統', 'info');
            }, 1000);
        });
