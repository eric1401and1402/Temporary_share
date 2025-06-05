function openFunction(FunctionName,elmnt,color) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablink");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.backgroundColor = "";
  }
  document.getElementById(FunctionName).style.display = "block";
  elmnt.style.backgroundColor = color;
}
 window.onload = function(e){ 
// Get the element with id="defaultOpen" and click on it
document.getElementById("defaultOpen").click(); 
};


document.addEventListener('DOMContentLoaded', function() {
// 上傳檔案的邏輯
    document.getElementById('uploadForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const files = this.files.files;
        const validity = document.getElementById('validity').value;

        // 檢查檔案大小是否超過 100MB
        const maxSize = 100 * 1024 * 1024; // 100MB in bytes
        let totalSize = 0;
        for (const file of files) {
            totalSize += file.size;
        }
        if (totalSize > maxSize) {
            alert('錯誤：檔案總大小超過 100MB');
            return;
        }

        const progressBar = document.getElementById('progressBar');
        const progress = document.getElementById('progress');
        progressBar.style.display = 'block';

        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }
        formData.append('validity', validity);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progress.style.width = percentComplete + '%';
                progress.textContent = Math.round(percentComplete) + '%';
            }
        });

        xhr.onerror = function() {
            alert('上傳失敗：網路連線異常');
            progressBar.style.display = 'none';
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                alert(data.message);

                const fileList = document.getElementById('fileList');
                const li = document.createElement('li');
                li.textContent = data.zipFileName + ' ';

                const qrButton = document.createElement('button');
                qrButton.textContent = 'QR Code';

                // QR Code 容器
                const qrContainer = document.createElement('div');
                qrContainer.style.marginTop = '10px';
                qrContainer.id = `${data.zipFileName}`;

                // 綁定按鈕事件生成 QR Code
                qrButton.onclick = function() {
                    if (!qrContainer.hasChildNodes()) {
                        new QRCode(qrContainer, {
                            text: `https://fileshare.erickawong.com/download/${data.zipFileName}`,
                            width: 128,
                            height: 128,
                        });
                    }
                };

                li.appendChild(qrButton);
                li.appendChild(qrContainer);
                fileList.appendChild(li);
            } else {
                alert('上傳失敗: ' + xhr.responseText);
            }
            progress.style.width = '0';
            progressBar.style.display = 'none';
        };

     xhr.send(formData);
    });

// 下載檔案的邏輯
    document.getElementById('downloadForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const filename = this.filename.value;
        window.location.href = `/download/${filename}`;
    });
});

updateList = function() {
 	 var input = document.getElementById('file');
    	var output = document.getElementById('uploadfileList');
    	var children = "";
        if(input.files.length === 0){
            output.innerHTML = '<p>點擊選取上傳文件</p>';
            return;
        };

    	for (var i = 0; i < input.files.length; ++i) {
       	 children += '<li>' + input.files.item(i).name + '</li>';
    	};

    	output.innerHTML = '<div>'+children+'</div>'; 
};
