class SypnexAPI{constructor(appId,helpers={}){this.appId=appId;this.baseUrl='/api';this.initialized=false;this.cleanupHooks=[];this.getAppSetting=helpers.getAppSetting||this._defaultGetAppSetting;this.getAllAppSettings=helpers.getAllAppSettings||this._defaultGetAllAppSettings;this.showNotification=helpers.showNotification||this._defaultShowNotification;this.init();}
async init(){try{if(typeof this.getAppSetting==='function'&&typeof this.getAllAppSettings==='function'){this.initialized=true;}else{console.warn('SypnexAPI: Running outside OS environment, some features may not work');}}catch(error){console.error('SypnexAPI initialization error:',error);}}
async _defaultGetAppSetting(key,defaultValue=null){try{const response=await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`);if(response.ok){const data=await response.json();return data.value!==undefined?data.value:defaultValue;}
return defaultValue;}catch(error){console.error(`SypnexAPI: Error getting setting ${key}:`,error);return defaultValue;}}
async _defaultGetAllAppSettings(){try{const response=await fetch(`${this.baseUrl}/app-settings/${this.appId}`);if(response.ok){const data=await response.json();return data.settings||{};}
return{};}catch(error){console.error('SypnexAPI: Error getting all settings:',error);return{};}}
_defaultShowNotification(message,type='info'){if(type==='error'){console.error(message);}}
getSypnexOS(){if(typeof window!=='undefined'&&window.sypnexOS){return window.sypnexOS;}
return null;}
getSypnexApps(){if(typeof window!=='undefined'&&window.sypnexApps){return window.sypnexApps;}
return null;}
async getAppMetadata(){try{const response=await fetch(`${this.baseUrl}/app-metadata/${this.appId}`);if(response.ok){const data=await response.json();return data.metadata;}
return null;}catch(error){console.error('SypnexAPI: Error getting app metadata:',error);return null;}}
isInitialized(){return this.initialized;}
getAppId(){return this.appId;}
async getWindowState(){try{const response=await fetch(`${this.baseUrl}/window-state/${this.appId}`);if(response.ok){const data=await response.json();return data.state;}
return null;}catch(error){console.error('SypnexAPI: Error getting window state:',error);return null;}}
async saveWindowState(state){try{const response=await fetch(`${this.baseUrl}/window-state/${this.appId}`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify(state)});if(response.ok){return true;}else{console.error('SypnexAPI: Failed to save window state');return false;}}catch(error){console.error('SypnexAPI: Error saving window state:',error);return false;}}
async refreshAppVersionsCache(){try{if(typeof window!=='undefined'&&window.sypnexOS&&window.sypnexOS.refreshLatestVersionsCache){const result=await window.sypnexOS.refreshLatestVersionsCache();if(result){return true;}else{console.warn(`SypnexAPI [${this.appId}]: App versions cache refresh failed`);return false;}}else{console.warn(`SypnexAPI [${this.appId}]: OS cache refresh not available - running outside OS environment`);return false;}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error refreshing app versions cache:`,error);return false;}}
async getServices(){const response=await this.proxyHTTP({url:'/api/services',method:'GET',headers:{'Content-Type':'application/json'}});if(!response||response.status<200||response.status>=300){throw new Error(`Request failed with status: ${response?.status || 'Unknown'}`);}
if(response.error){throw new Error(response.error);}
const data=response.content;return data.services||[];}
async startService(serviceId){const response=await this.proxyHTTP({url:`/api/services/${serviceId}/start`,method:'POST',headers:{'Content-Type':'application/json'}});if(!response||response.status<200||response.status>=300){throw new Error(`Request failed with status: ${response?.status || 'Unknown'}`);}
if(response.error){throw new Error(response.error);}}
async stopService(serviceId){const response=await this.proxyHTTP({url:`/api/services/${serviceId}/stop`,method:'POST',headers:{'Content-Type':'application/json'}});if(!response||response.status<200||response.status>=300){throw new Error(`Request failed with status: ${response?.status || 'Unknown'}`);}
if(response.error){throw new Error(response.error);}}
onBeforeClose(cleanupFunction,description='User cleanup'){if(typeof cleanupFunction!=='function'){console.warn(`SypnexAPI [${this.appId}]: onBeforeClose expects a function, got ${typeof cleanupFunction}`);return;}
this.cleanupHooks.push({fn:cleanupFunction,description:description});}
removeCleanupHook(cleanupFunction){const index=this.cleanupHooks.findIndex(hook=>hook.fn===cleanupFunction);if(index>-1){this.cleanupHooks.splice(index,1);}}
cleanup(){if(this.cleanupHooks.length===0){return;}
for(const hook of this.cleanupHooks){try{hook.fn();}catch(error){console.error(`SypnexAPI [${this.appId}]: Error in cleanup hook "${hook.description}":`,error);}}
this.cleanupHooks=[];}}
if(typeof module!=='undefined'&&module.exports){module.exports=SypnexAPI;}
if(typeof window!=='undefined'){window.SypnexAPI=SypnexAPI;}
if(typeof window!=='undefined'&&window.fetch&&!window._sypnexFetchOverridden){const originalFetch=window.fetch;window.fetch=function(url,options={}){if(!options.headers){options.headers={};}
if(typeof url==='string'&&url.startsWith('/')){options.headers['X-Session-Token']='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRlbW8iLCJjcmVhdGVkX2F0IjoxNzU1NTI5NzE0LjE4MzM5NCwiZXhwIjoxNzU1NjE2MTE0LjE4MzM5NCwiaXNzIjoieW91ci1pbnN0YW5jZS1uYW1lIiwiaWF0IjoxNzU1NTI5NzE0LjE4MzM5NH0.I-v0ZoNWBsxmXxImhb9FwtT5I-jEnyB0BXqk2AeZxYY';}
return originalFetch(url,options);};window._sypnexFetchOverridden=true;}
Object.assign(SypnexAPI.prototype,{async showConfirmation(title,message,options={}){const{confirmText='Yes',cancelText='No',type='warning',icon='fas fa-exclamation-triangle'}=options;return new Promise((resolve)=>{const existingModal=document.getElementById('sypnex-confirmation-modal');if(existingModal){existingModal.remove();}
const modal=document.createElement('div');modal.id='sypnex-confirmation-modal';modal.style.cssText=`
                display: block;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
            `;const modalContent=document.createElement('div');modalContent.style.cssText=`
                background-color: var(--glass-bg);
                margin: 5% auto;
                padding: 0;
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                backdrop-filter: blur(10px);
            `;const modalHeader=document.createElement('div');modalHeader.style.cssText=`
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--glass-border);
            `;const headerTitle=document.createElement('h3');headerTitle.style.cssText=`
                margin: 0;
                color: var(--text-primary);
            `;headerTitle.innerHTML=`<i class="${icon}"></i> ${title}`;const closeBtn=document.createElement('button');closeBtn.innerHTML='&times;';closeBtn.style.cssText=`
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--text-secondary);
            `;closeBtn.onmouseover=()=>closeBtn.style.color='var(--text-primary)';closeBtn.onmouseout=()=>closeBtn.style.color='var(--text-secondary)';modalHeader.appendChild(headerTitle);modalHeader.appendChild(closeBtn);const modalBody=document.createElement('div');modalBody.style.cssText=`padding: 20px;`;const messageP=document.createElement('p');messageP.style.cssText=`
                color: var(--text-primary);
                margin: 0 0 15px 0;
                line-height: 1.5;
            `;messageP.textContent=message;modalBody.appendChild(messageP);if(type==='danger'){const warningP=document.createElement('p');warningP.style.cssText=`
                    color: var(--error-color);
                    margin: 10px 0 0 0;
                    font-size: 14px;
                    font-style: italic;
                `;warningP.textContent='This action cannot be undone.';modalBody.appendChild(warningP);}
const modalFooter=document.createElement('div');modalFooter.style.cssText=`
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 20px;
                border-top: 1px solid var(--glass-border);
            `;const cancelBtn=document.createElement('button');cancelBtn.textContent=cancelText;cancelBtn.className='app-btn secondary';const confirmBtn=document.createElement('button');confirmBtn.textContent=confirmText;confirmBtn.className=`app-btn ${type === 'danger' ? 'danger' : 'primary'}`;modalFooter.appendChild(cancelBtn);modalFooter.appendChild(confirmBtn);modalContent.appendChild(modalHeader);modalContent.appendChild(modalBody);modalContent.appendChild(modalFooter);modal.appendChild(modalContent);document.body.appendChild(modal);const closeModal=(confirmed)=>{modal.remove();resolve(confirmed);document.removeEventListener('keydown',escapeHandler);};closeBtn.addEventListener('click',()=>closeModal(false));cancelBtn.addEventListener('click',()=>closeModal(false));confirmBtn.addEventListener('click',()=>closeModal(true));const escapeHandler=(e)=>{if(e.key==='Escape'){closeModal(false);}};document.addEventListener('keydown',escapeHandler);});},async showInputModal(title,message,options={}){const{placeholder='',defaultValue='',confirmText='Create',cancelText='Cancel',icon='fas fa-edit',inputType='text'}=options;return new Promise((resolve)=>{const existingModal=document.getElementById('sypnex-input-modal');if(existingModal){existingModal.remove();}
const modal=document.createElement('div');modal.id='sypnex-input-modal';modal.style.cssText=`
                display: block;
                position: fixed;
                z-index: 11000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            `;const modalContent=document.createElement('div');modalContent.style.cssText=`
                background: var(--glass-bg);
                margin: 5% auto;
                padding: 0;
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            `;const modalHeader=document.createElement('div');modalHeader.style.cssText=`
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--glass-border);
                background: var(--glass-bg);
                border-radius: 12px 12px 0 0;
            `;const headerTitle=document.createElement('h3');headerTitle.style.cssText=`
                margin: 0;
                color: var(--text-primary);
                font-size: 1.2em;
                display: flex;
                align-items: center;
                gap: 10px;
            `;headerTitle.innerHTML=`<i class="${icon}" style="color: var(--accent-color);"></i> ${title}`;const closeBtn=document.createElement('button');closeBtn.innerHTML='&times;';closeBtn.style.cssText=`
                background: none;
                border: none;
                font-size: 1.5em;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            `;closeBtn.onmouseover=()=>{closeBtn.style.background='rgba(255, 71, 87, 0.1)';closeBtn.style.color='#ff4757';closeBtn.style.transform='scale(1.1)';};closeBtn.onmouseout=()=>{closeBtn.style.background='none';closeBtn.style.color='var(--text-secondary)';closeBtn.style.transform='scale(1)';};modalHeader.appendChild(headerTitle);modalHeader.appendChild(closeBtn);const modalBody=document.createElement('div');modalBody.style.cssText=`
                padding: 20px;
                background: var(--glass-bg);
            `;const label=document.createElement('label');label.style.cssText=`
                display: block;
                margin-bottom: 5px;
                color: var(--text-primary);
                font-weight: bold;
                font-size: 14px;
            `;label.textContent=message;let input;if(inputType==='textarea'){input=document.createElement('textarea');input.style.cssText=`
                    width: 100%;
                    padding: 10px;
                    border: 1px solid var(--glass-border);
                    border-radius: 6px;
                    background: rgba(20, 20, 20, 0.8);
                    color: var(--text-primary);
                    font-family: inherit;
                    font-size: 14px;
                    resize: vertical;
                    min-height: 120px;
                    box-sizing: border-box;
                `;}else{input=document.createElement('input');input.type='text';input.style.cssText=`
                    width: 100%;
                    padding: 10px;
                    border: 1px solid var(--glass-border);
                    border-radius: 6px;
                    background: rgba(20, 20, 20, 0.8);
                    color: var(--text-primary);
                    font-family: inherit;
                    font-size: 14px;
                    box-sizing: border-box;
                `;}
input.placeholder=placeholder;input.value=defaultValue;input.onfocus=()=>{input.style.borderColor='var(--accent-color)';input.style.boxShadow='0 0 0 2px rgba(0, 212, 255, 0.2)';};input.onblur=()=>{input.style.borderColor='var(--glass-border)';input.style.boxShadow='none';};modalBody.appendChild(label);modalBody.appendChild(input);const modalFooter=document.createElement('div');modalFooter.style.cssText=`
                padding: 20px;
                border-top: 1px solid var(--glass-border);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: var(--glass-bg);
                border-radius: 0 0 12px 12px;
            `;const cancelBtn=document.createElement('button');cancelBtn.textContent=cancelText;cancelBtn.className='app-btn secondary';const confirmBtn=document.createElement('button');confirmBtn.textContent=confirmText;confirmBtn.className='app-btn primary';modalFooter.appendChild(cancelBtn);modalFooter.appendChild(confirmBtn);modalContent.appendChild(modalHeader);modalContent.appendChild(modalBody);modalContent.appendChild(modalFooter);modal.appendChild(modalContent);document.body.appendChild(modal);setTimeout(()=>input.focus(),100);const closeModal=(inputValue)=>{modal.remove();resolve(inputValue);document.removeEventListener('keydown',escapeHandler);};closeBtn.addEventListener('click',()=>closeModal(null));cancelBtn.addEventListener('click',()=>closeModal(null));confirmBtn.addEventListener('click',()=>{const value=input.value.trim();if(value){closeModal(value);}});input.addEventListener('keydown',(e)=>{if(e.key==='Enter'&&(inputType!=='textarea'||e.ctrlKey)){e.preventDefault();const value=input.value.trim();if(value){closeModal(value);}}});const escapeHandler=(e)=>{if(e.key==='Escape'){closeModal(null);}};document.addEventListener('keydown',escapeHandler);});},async showFileUploadModal(title,message,options={}){const{confirmText='Upload',cancelText='Cancel',icon='fas fa-upload',accept='*',uploadCallback=null}=options;return new Promise((resolve)=>{const existingModal=document.getElementById('sypnex-upload-modal');if(existingModal){existingModal.remove();}
const modal=document.createElement('div');modal.id='sypnex-upload-modal';modal.style.cssText=`
                display: block;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            `;const modalContent=document.createElement('div');modalContent.style.cssText=`
                background: var(--glass-bg);
                margin: 5% auto;
                padding: 0;
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            `;const modalHeader=document.createElement('div');modalHeader.style.cssText=`
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--glass-border);
                background: var(--glass-bg);
                border-radius: 12px 12px 0 0;
            `;const headerTitle=document.createElement('h3');headerTitle.style.cssText=`
                margin: 0;
                color: var(--text-primary);
                font-size: 1.2em;
                display: flex;
                align-items: center;
                gap: 10px;
            `;headerTitle.innerHTML=`<i class="${icon}" style="color: var(--accent-color);"></i> ${title}`;const closeBtn=document.createElement('button');closeBtn.innerHTML='&times;';closeBtn.style.cssText=`
                background: none;
                border: none;
                font-size: 1.5em;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            `;closeBtn.onmouseover=()=>{closeBtn.style.background='rgba(255, 71, 87, 0.1)';closeBtn.style.color='#ff4757';closeBtn.style.transform='scale(1.1)';};closeBtn.onmouseout=()=>{closeBtn.style.background='none';closeBtn.style.color='var(--text-secondary)';closeBtn.style.transform='scale(1)';};modalHeader.appendChild(headerTitle);modalHeader.appendChild(closeBtn);const modalBody=document.createElement('div');modalBody.style.cssText=`
                padding: 20px;
                background: var(--glass-bg);
            `;const label=document.createElement('label');label.style.cssText=`
                display: block;
                margin-bottom: 5px;
                color: var(--text-primary);
                font-weight: bold;
                font-size: 14px;
            `;label.textContent=message;const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept=accept;fileInput.style.cssText=`
                display: none;
            `;const customFileBtn=document.createElement('button');customFileBtn.type='button';customFileBtn.className='app-btn secondary';customFileBtn.style.cssText=`
                width: 100%;
                padding: 12px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border: 2px dashed var(--glass-border);
                background: rgba(0, 212, 255, 0.05);
                transition: all 0.3s ease;
            `;customFileBtn.innerHTML=`
                <i class="fas fa-cloud-upload-alt"></i>
                <span>Choose File to Upload</span>
            `;customFileBtn.onmouseover=()=>{customFileBtn.style.borderColor='var(--accent-color)';customFileBtn.style.background='rgba(0, 212, 255, 0.1)';customFileBtn.style.transform='translateY(-1px)';};customFileBtn.onmouseout=()=>{customFileBtn.style.borderColor='var(--glass-border)';customFileBtn.style.background='rgba(0, 212, 255, 0.05)';customFileBtn.style.transform='translateY(0)';};customFileBtn.addEventListener('click',()=>{fileInput.click();});const fileInfo=document.createElement('div');fileInfo.style.cssText=`
                display: none;
                background: rgba(0, 212, 255, 0.1);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 6px;
                padding: 10px;
                margin-top: 10px;
            `;const progressContainer=document.createElement('div');progressContainer.style.cssText=`
                display: none;
                margin-top: 15px;
            `;const progressLabel=document.createElement('div');progressLabel.style.cssText=`
                color: var(--text-primary);
                font-size: 14px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;progressLabel.innerHTML=`
                <span>Uploading...</span>
                <span class="progress-percent">0%</span>
            `;const progressBarBg=document.createElement('div');progressBarBg.style.cssText=`
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                overflow: hidden;
                border: 1px solid var(--glass-border);
            `;const progressBarFill=document.createElement('div');progressBarFill.style.cssText=`
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, var(--accent-color), #00ff88);
                border-radius: 4px;
                transition: width 0.3s ease;
                box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
            `;progressBarBg.appendChild(progressBarFill);progressContainer.appendChild(progressLabel);progressContainer.appendChild(progressBarBg);modalBody.appendChild(label);modalBody.appendChild(customFileBtn);modalBody.appendChild(fileInput);modalBody.appendChild(fileInfo);modalBody.appendChild(progressContainer);const modalFooter=document.createElement('div');modalFooter.style.cssText=`
                padding: 20px;
                border-top: 1px solid var(--glass-border);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: var(--glass-bg);
                border-radius: 0 0 12px 12px;
            `;const cancelBtn=document.createElement('button');cancelBtn.textContent=cancelText;cancelBtn.className='app-btn secondary';const confirmBtn=document.createElement('button');confirmBtn.textContent=confirmText;confirmBtn.className='app-btn primary';confirmBtn.disabled=true;modalFooter.appendChild(cancelBtn);modalFooter.appendChild(confirmBtn);modalContent.appendChild(modalHeader);modalContent.appendChild(modalBody);modalContent.appendChild(modalFooter);modal.appendChild(modalContent);document.body.appendChild(modal);fileInput.addEventListener('change',(e)=>{const file=e.target.files[0];if(file){confirmBtn.disabled=false;customFileBtn.innerHTML=`
                        <i class="fas fa-check-circle" style="color: var(--accent-color);"></i>
                        <span>${file.name}</span>
                    `;customFileBtn.style.borderColor='var(--accent-color)';customFileBtn.style.background='rgba(0, 212, 255, 0.15)';fileInfo.style.display='block';fileInfo.innerHTML=`
                        <p style="margin: 5px 0; color: var(--text-primary); font-size: 14px;">
                            <strong style="color: var(--accent-color);">Selected File:</strong> ${file.name}
                        </p>
                        <p style="margin: 5px 0; color: var(--text-primary); font-size: 14px;">
                            <strong style="color: var(--accent-color);">Size:</strong> ${(file.size / 1024).toFixed(1)} KB
                        </p>
                    `;}else{confirmBtn.disabled=true;customFileBtn.innerHTML=`
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Choose File to Upload</span>
                    `;customFileBtn.style.borderColor='var(--glass-border)';customFileBtn.style.background='rgba(0, 212, 255, 0.05)';fileInfo.style.display='none';}});const closeModal=(selectedFile)=>{modal.remove();resolve(selectedFile);document.removeEventListener('keydown',escapeHandler);};closeBtn.addEventListener('click',()=>closeModal(null));cancelBtn.addEventListener('click',()=>closeModal(null));confirmBtn.addEventListener('click',async()=>{const file=fileInput.files[0];if(file&&uploadCallback){progressContainer.style.display='block';confirmBtn.disabled=true;customFileBtn.style.display='none';cancelBtn.textContent='Cancel Upload';let currentUpload=null;const updateProgress=(percent)=>{progressBarFill.style.width=percent+'%';progressContainer.querySelector('.progress-percent').textContent=Math.round(percent)+'%';};const uploadCancelHandler=()=>{if(currentUpload&&currentUpload.abort){currentUpload.abort();}
closeModal(null);};cancelBtn.removeEventListener('click',closeModal);cancelBtn.addEventListener('click',uploadCancelHandler);try{const uploadResult=uploadCallback(file,updateProgress);if(uploadResult&&uploadResult.promise&&uploadResult.abort){currentUpload=uploadResult;const result=await uploadResult.promise;closeModal(result);}else{const result=await uploadResult;closeModal(result);}}catch(error){progressContainer.style.display='none';confirmBtn.disabled=false;cancelBtn.textContent=cancelText;customFileBtn.style.display='block';cancelBtn.removeEventListener('click',uploadCancelHandler);cancelBtn.addEventListener('click',()=>closeModal(null));if(error.message!=='Upload cancelled by user'){const errorDiv=document.createElement('div');errorDiv.style.cssText=`
                                background: rgba(255, 71, 87, 0.1);
                                border: 1px solid rgba(255, 71, 87, 0.3);
                                border-radius: 6px;
                                padding: 10px;
                                margin-top: 10px;
                                color: #ff4757;
                            `;errorDiv.innerHTML=`<i class="fas fa-exclamation-triangle"></i> Upload failed: ${error.message}`;modalBody.appendChild(errorDiv);setTimeout(()=>{if(errorDiv.parentNode){errorDiv.remove();}},5000);}}}else if(file){closeModal(file);}});const escapeHandler=(e)=>{if(e.key==='Escape'){closeModal(null);}};document.addEventListener('keydown',escapeHandler);});},createHamburgerMenu(container,menuItems,options={}){const{position='right',buttonClass='',menuId=`hamburger-menu-${Date.now()}`}=options;const hamburgerBtn=document.createElement('button');hamburgerBtn.className=`hamburger-btn ${buttonClass}`;hamburgerBtn.innerHTML='<i class="fas fa-bars"></i>';hamburgerBtn.style.cssText=`
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            color: var(--text-primary);
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        `;const dropdownMenu=document.createElement('div');dropdownMenu.id=menuId;dropdownMenu.className='sypnex-dropdown-menu';dropdownMenu.style.cssText=`
            display: none;
            position: absolute;
            ${position}: 0;
            top: 100%;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            min-width: 180px;
            width: 180px;
            max-height: 70vh;
            overflow-y: auto;
            padding: 0;
            margin-top: 4px;
            backdrop-filter: blur(10px);
        `;menuItems.forEach(item=>{if(item.type==='separator'){const separator=document.createElement('div');separator.style.cssText=`
                    height: 1px;
                    background: var(--glass-border);
                    margin: 4px 0;
                `;dropdownMenu.appendChild(separator);}else{const menuItem=document.createElement('button');menuItem.className='sypnex-menu-item';menuItem.innerHTML=`
                    <i class="${item.icon}" style="width: 16px; margin-right: 10px;"></i>
                    ${item.text}
                `;menuItem.style.cssText=`
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 10px 16px;
                    background: none;
                    border: none;
                    text-align: left;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    font-size: 14px;
                `;menuItem.addEventListener('mouseenter',()=>{menuItem.style.background='var(--glass-hover)';});menuItem.addEventListener('mouseleave',()=>{menuItem.style.background='none';});menuItem.addEventListener('click',()=>{if(typeof item.action==='function'){item.action();}
hideMenu();});dropdownMenu.appendChild(menuItem);}});if(container.style.position!=='relative'&&container.style.position!=='absolute'){container.style.position='relative';}
container.appendChild(hamburgerBtn);container.appendChild(dropdownMenu);const showMenu=()=>{dropdownMenu.style.display='block';hamburgerBtn.style.background='var(--glass-hover)';};const hideMenu=()=>{dropdownMenu.style.display='none';hamburgerBtn.style.background='var(--glass-bg)';};const toggleMenu=()=>{if(dropdownMenu.style.display==='none'||dropdownMenu.style.display===''){showMenu();}else{hideMenu();}};hamburgerBtn.addEventListener('click',(e)=>{e.stopPropagation();toggleMenu();});document.addEventListener('click',(e)=>{if(!container.contains(e.target)){hideMenu();}});hamburgerBtn.addEventListener('mouseenter',()=>{if(dropdownMenu.style.display==='none'||dropdownMenu.style.display===''){hamburgerBtn.style.background='var(--glass-hover)';}});hamburgerBtn.addEventListener('mouseleave',()=>{if(dropdownMenu.style.display==='none'||dropdownMenu.style.display===''){hamburgerBtn.style.background='var(--glass-bg)';}});return{show:showMenu,hide:hideMenu,toggle:toggleMenu,button:hamburgerBtn,menu:dropdownMenu,destroy:()=>{hamburgerBtn.remove();dropdownMenu.remove();}};}});(function(){if(window.sypnexKeyboardManager)return;const keyboardState={appShortcuts:new Map(),isInitialized:false};function handleGlobalKeydown(event){const activeAppId=window.sypnexOS&&window.sypnexOS.activeWindow;if(!activeAppId||!keyboardState.appShortcuts.has(activeAppId))return;const activeWindowElement=window.sypnexOS.apps&&window.sypnexOS.apps.get(activeAppId);if(activeWindowElement&&activeWindowElement.dataset.minimized==='true'){return;}
const appConfig=keyboardState.appShortcuts.get(activeAppId);const keyString=eventToKeyString(event);const handler=appConfig.shortcuts[keyString];if(handler&&typeof handler==='function'){if(appConfig.config.preventDefault!==false){event.preventDefault();}
if(appConfig.config.stopPropagation){event.stopPropagation();}
try{handler();}catch(error){console.error(`SypnexKeyboardManager: Error executing shortcut "${keyString}" for app ${activeAppId}:`,error);}}
}
function eventToKeyString(event){const parts=[];if(event.ctrlKey)parts.push('ctrl');if(event.altKey)parts.push('alt');if(event.shiftKey)parts.push('shift');if(event.metaKey)parts.push('meta');let key=event.key.toLowerCase();if(key===' ')key='space';if(key==='escape')key='escape';if(key.startsWith('arrow'))key=key;parts.push(key);return parts.join('+');}
function initKeyboardManager(){if(keyboardState.isInitialized)return;document.addEventListener('keydown',handleGlobalKeydown);keyboardState.isInitialized=true;}
window.sypnexKeyboardManager={registerApp(appId,shortcuts,config){keyboardState.appShortcuts.set(appId,{shortcuts,config});},unregisterApp(appId){const appConfig=keyboardState.appShortcuts.get(appId);if(appConfig){const shortcutCount=Object.keys(appConfig.shortcuts).length;keyboardState.appShortcuts.delete(appId);return shortcutCount;}
return 0;},getStats(){const totalShortcuts=Array.from(keyboardState.appShortcuts.values()).reduce((total,config)=>total+Object.keys(config.shortcuts).length,0);const activeAppId=window.sypnexOS&&window.sypnexOS.activeWindow;return{registeredApps:keyboardState.appShortcuts.size,totalShortcuts:totalShortcuts,activeApp:activeAppId};}};initKeyboardManager();})();Object.assign(SypnexAPI.prototype,{registerKeyboardShortcuts(shortcuts,config={}){const appId=this.appId;if(!appId){console.warn('SypnexAPI: Cannot register keyboard shortcuts - no appId available');return;}
const defaultConfig={preventDefault:true,stopPropagation:false};const finalConfig=Object.assign({},defaultConfig,config);window.sypnexKeyboardManager.registerApp(appId,shortcuts,finalConfig);if(window.appKeyboardShortcuts){window.appKeyboardShortcuts.set(appId,Object.keys(shortcuts));}},getKeyboardStats(){return window.sypnexKeyboardManager.getStats();}});(function(){if(window.sypnexWindowManager)return;const windowState={appWindows:new Map(),isInitialized:false};function createAppWindowProxy(appId){if(windowState.appWindows.has(appId)){const existingData=windowState.appWindows.get(appId);if(existingData.windowProxy){return existingData.windowProxy;}}
const appProperties=new Set();if(!windowState.appWindows.has(appId)){windowState.appWindows.set(appId,{windowProxy:null,properties:appProperties});}else{windowState.appWindows.get(appId).properties=appProperties;}
const boundMethods=new Set(['getComputedStyle','getSelection','matchMedia','requestAnimationFrame','cancelAnimationFrame','requestIdleCallback','cancelIdleCallback','scrollTo','scroll','scrollBy','resizeTo','resizeBy','moveTo','moveBy','alert','confirm','prompt','print','focus','blur','find','stop','atob','btoa']);const windowProxy=new Proxy(window,{set(target,property,value){appProperties.add(property);target[property]=value;return true;},get(target,property){const value=target[property];if(typeof value==='function'&&boundMethods.has(property)){return value.bind(target);}
return value;},has(target,property){return property in target;},deleteProperty(target,property){appProperties.delete(property);delete target[property];return true;}});windowState.appWindows.get(appId).windowProxy=windowProxy;return windowProxy;}
function cleanupAppWindow(appId){const appData=windowState.appWindows.get(appId);if(!appData)return;const{properties}=appData;let cleanedCount=0;for(const property of properties){if(property in window){try{delete window[property];cleanedCount++;}catch(error){console.warn(`App ${appId}: Failed to clean up window.${property}:`,error);}}}
properties.clear();windowState.appWindows.delete(appId);if(cleanedCount>0){}}
function initializeWindowManager(){if(windowState.isInitialized)return;if(window.sypnexAppSandbox&&window.sypnexAppSandbox.addCleanupHook){window.sypnexAppSandbox.addCleanupHook('window-management',(appId)=>{cleanupAppWindow(appId);});}
windowState.isInitialized=true;}
initializeWindowManager();window.sypnexWindowManager={createAppWindowProxy,cleanupAppWindow,state:windowState};})();Object.assign(SypnexAPI.prototype,{getAppWindow(){if(!window.sypnexWindowManager){console.error('SypnexAPI: Window manager not initialized');return window;}
return window.sypnexWindowManager.createAppWindowProxy(this.appId);},cleanupAppWindow(){if(!window.sypnexWindowManager){console.warn('SypnexAPI: Window manager not initialized');return;}
window.sypnexWindowManager.cleanupAppWindow(this.appId);}});const scalingUtils={_appScale:1.0,detectAppScale(){try{const appWindow=document.querySelector('.app-window');if(!appWindow){return 1.0;}
const scaleClasses=['scale-75','scale-80','scale-85','scale-90','scale-95','scale-100','scale-105','scale-110','scale-115','scale-120','scale-125','scale-130','scale-135','scale-140','scale-145','scale-150'];for(const scaleClass of scaleClasses){if(appWindow.classList.contains(scaleClass)){const scaleValue=parseInt(scaleClass.replace('scale-',''));this._appScale=scaleValue/100;return this._appScale;}}
const computedStyle=window.getComputedStyle(appWindow);const transform=computedStyle.transform;if(transform&&transform!=='none'){const matrix=transform.match(/matrix\(([^)]+)\)/);if(matrix){const values=matrix[1].split(',').map(v=>parseFloat(v.trim()));if(values.length>=4){const scaleX=values[0];const scaleY=values[3];this._appScale=(scaleX+scaleY)/2;return this._appScale;}}}
this._appScale=1.0;return 1.0;}catch(error){console.error('Error detecting app scale:',error);this._appScale=1.0;return 1.0;}},getEffectiveScale(zoomScale=1.0){const appScale=this.detectAppScale();return appScale*zoomScale;},screenToAppCoords(screenX,screenY,zoomScale=1.0){const scale=this.getEffectiveScale(zoomScale);return{x:screenX/scale,y:screenY/scale};},appToScreenCoords(appX,appY,zoomScale=1.0){const scale=this.getEffectiveScale(zoomScale);return{x:appX*scale,y:appY*scale};},getScaledBoundingClientRect(element){const rect=element.getBoundingClientRect();const appScale=this.detectAppScale();return{left:rect.left/appScale,top:rect.top/appScale,right:rect.right/appScale,bottom:rect.bottom/appScale,width:rect.width/appScale,height:rect.height/appScale,x:rect.x/appScale,y:rect.y/appScale};},getScaledMouseCoords(e){const appScale=this.detectAppScale();return{x:e.clientX/appScale,y:e.clientY/appScale};},initScaleDetection(onScaleChange=null){this.detectAppScale();const observer=new MutationObserver((mutations)=>{mutations.forEach((mutation)=>{if(mutation.type==='attributes'&&mutation.attributeName==='class'){const oldScale=this._appScale;const newScale=this.detectAppScale();if(oldScale!==newScale){if(onScaleChange&&typeof onScaleChange==='function'){onScaleChange(newScale,oldScale);}}}});});const appWindow=document.querySelector('.app-window');if(appWindow){observer.observe(appWindow,{attributes:true,attributeFilter:['class']});}
return observer;},getCurrentScale(){return this._appScale;},refreshScale(){return this.detectAppScale();}};Object.assign(SypnexAPI.prototype,{get scaling(){return scalingUtils;},detectAppScale(){return scalingUtils.detectAppScale();},getScaledMouseCoords(e){return scalingUtils.getScaledMouseCoords(e);},getScaledBoundingClientRect(element){return scalingUtils.getScaledBoundingClientRect(element);},screenToAppCoords(screenX,screenY,zoomScale=1.0){return scalingUtils.screenToAppCoords(screenX,screenY,zoomScale);},appToScreenCoords(appX,appY,zoomScale=1.0){return scalingUtils.appToScreenCoords(appX,appY,zoomScale);},initScaleDetection(onScaleChange=null){return scalingUtils.initScaleDetection(onScaleChange);}});Object.assign(SypnexAPI.prototype,{async getSetting(key,defaultValue=null){try{return await this.getAppSetting(key,defaultValue);}catch(error){console.error(`SypnexAPI: Error getting setting ${key}:`,error);return defaultValue;}},async setSetting(key,value){try{const response=await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify({value})});if(response.ok){return true;}else{console.error(`SypnexAPI: Failed to save setting ${key}`);return false;}}catch(error){console.error(`SypnexAPI: Error setting ${key}:`,error);return false;}},async getAllSettings(){try{return await this.getAllAppSettings();}catch(error){console.error('SypnexAPI: Error getting all settings:',error);return{};}},async deleteSetting(key){try{const response=await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`,{method:'DELETE'});if(response.ok){return true;}else{console.error(`SypnexAPI: Failed to delete setting ${key}`);return false;}}catch(error){console.error(`SypnexAPI: Error deleting setting ${key}:`,error);return false;}},async getPreference(category,key,defaultValue=null){try{const response=await fetch(`${this.baseUrl}/preferences/${category}/${key}`);if(response.ok){const data=await response.json();return data.value!==undefined?data.value:defaultValue;}
return defaultValue;}catch(error){console.error(`SypnexAPI: Error getting preference ${category}.${key}:`,error);return defaultValue;}},async setPreference(category,key,value){try{const response=await fetch(`${this.baseUrl}/preferences/${category}/${key}`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify({value})});if(response.ok){return true;}else{console.error(`SypnexAPI: Failed to save preference ${category}.${key}`);return false;}}catch(error){console.error(`SypnexAPI: Error setting preference ${category}.${key}:`,error);return false;}}});Object.assign(SypnexAPI.prototype,{async encrypt(value){try{const response=await fetch(`${this.baseUrl}/crypto/encrypt`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify({value})});if(response.ok){const data=await response.json();if(data.success){return data.encrypted;}else{console.error('SypnexAPI: Encryption failed:',data.error);return null;}}else{console.error('SypnexAPI: Encryption request failed:',response.status);return null;}}catch(error){console.error('SypnexAPI: Error encrypting value:',error);return null;}},async decrypt(encryptedValue){try{const response=await fetch(`${this.baseUrl}/crypto/decrypt`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify({encrypted:encryptedValue})});if(response.ok){const data=await response.json();if(data.success){return data.value;}else{console.error('SypnexAPI: Decryption failed:',data.error);return null;}}else{console.error('SypnexAPI: Decryption request failed:',response.status);return null;}}catch(error){console.error('SypnexAPI: Error decrypting value:',error);return null;}}});Object.assign(SypnexAPI.prototype,{socket:null,socketConnected:false,socketEventListeners:new Map(),socketUrl:window.location.origin,autoReconnect:true,reconnectAttempts:0,maxReconnectAttempts:10,reconnectDelay:1000,maxReconnectDelay:30000,reconnectTimer:null,roomsToRejoin:new Set(),manualDisconnect:false,healthCheckInterval:30000,healthCheckTimer:null,enableHealthChecks:true,async connectSocket(url=null,options={}){try{const socketUrl=url||this.socketUrl;const fullUrl=socketUrl;const defaultOptions={transports:['websocket','polling'],autoConnect:true,forceNew:true,reconnection:this.autoReconnect,reconnectionAttempts:this.maxReconnectAttempts,reconnectionDelay:this.reconnectDelay,reconnectionDelayMax:this.maxReconnectDelay,timeout:20000,...options};this.socket=io(fullUrl,defaultOptions);if(this.socket.io&&this.socket.io.engine){const originalOnError=this.socket.io.engine.onerror;this.socket.io.engine.onerror=(error)=>{if(!this.manualDisconnect){if(originalOnError){originalOnError.call(this.socket.io.engine,error);}}};}
this.socket.on('connect',()=>{this.socketConnected=true;this._triggerEvent('socket_connected',{appId:this.appId});this.socket.emit('app_connect',{appId:this.appId,timestamp:Date.now()});this.startHealthChecks();});this.socket.on('disconnect',(reason)=>{this.socketConnected=false;this._triggerEvent('socket_disconnected',{appId:this.appId,reason});if(this.manualDisconnect){this.manualDisconnect=false;return;}
if(this.autoReconnect&&reason!=='io client disconnect'){this._scheduleReconnect();}});this.socket.on('connect_error',(error)=>{if(!this.manualDisconnect){console.error(`SypnexAPI [${this.appId}]: Socket.IO connection error:`,error);this._triggerEvent('socket_error',{appId:this.appId,error:error.message});}});this.socket.on('reconnect_attempt',(attemptNumber)=>{this._triggerEvent('reconnect_attempt',{appId:this.appId,attempt:attemptNumber});});this.socket.on('reconnect',(attemptNumber)=>{this.socketConnected=true;this.reconnectAttempts=0;this._triggerEvent('reconnected',{appId:this.appId,attempts:attemptNumber});this._rejoinRooms();});this.socket.on('reconnect_error',(error)=>{console.error(`SypnexAPI [${this.appId}]: Reconnection error:`,error);this._triggerEvent('reconnect_error',{appId:this.appId,error:error.message});});this.socket.on('reconnect_failed',()=>{console.error(`SypnexAPI [${this.appId}]: Reconnection failed after ${this.maxReconnectAttempts} attempts`);this._triggerEvent('reconnect_failed',{appId:this.appId,attempts:this.maxReconnectAttempts});});return new Promise((resolve)=>{if(this.socket.connected){resolve(true);}else{this.socket.once('connect',()=>resolve(true));this.socket.once('connect_error',()=>resolve(false));}});}catch(error){console.error(`SypnexAPI [${this.appId}]: Error connecting to Socket.IO:`,error);return false;}},disconnectSocket(){if(this.socket){this.manualDisconnect=true;this.stopHealthChecks();this.socket.disconnect();this.socket=null;this.socketConnected=false;this.roomsToRejoin.clear();}},isSocketConnected(){return this.socketConnected&&this.socket&&this.socket.connected;},sendMessage(event,data,room=null){if(!this.isSocketConnected()){console.error(`SypnexAPI [${this.appId}]: Cannot send message - not connected`);return false;}
try{const messageData={appId:this.appId,data:data,timestamp:Date.now()};if(room){this.socket.emit('message',{message:data,room:room,event_type:event,appId:this.appId});}else{this.socket.emit('message',{message:data,room:'global',event_type:event,appId:this.appId});}
return true;}catch(error){console.error(`SypnexAPI [${this.appId}]: Error sending message:`,error);return false;}},joinRoom(roomName){if(!this.isSocketConnected()){console.error(`SypnexAPI [${this.appId}]: Cannot join room - not connected`);return false;}
try{this.socket.emit('join_room',{room:roomName,appId:this.appId});this.roomsToRejoin.add(roomName);return true;}catch(error){console.error(`SypnexAPI [${this.appId}]: Error joining room:`,error);return false;}},leaveRoom(roomName){if(!this.isSocketConnected()){console.error(`SypnexAPI [${this.appId}]: Cannot leave room - not connected`);return false;}
try{this.socket.emit('leave_room',{room:roomName,appId:this.appId});this.roomsToRejoin.delete(roomName);return true;}catch(error){console.error(`SypnexAPI [${this.appId}]: Error leaving room:`,error);return false;}},async ping(){if(!this.isSocketConnected()){throw new Error('Socket not connected');}
return new Promise((resolve)=>{const startTime=Date.now();this.socket.emit('ping',()=>{const pingTime=Date.now()-startTime;resolve(pingTime);});});},on(eventName,callback){if(!this.socket){console.error(`SypnexAPI [${this.appId}]: Cannot listen for events - not connected`);return;}
if(!this.socketEventListeners.has(eventName)){this.socketEventListeners.set(eventName,[]);}
this.socketEventListeners.get(eventName).push(callback);this.socket.on(eventName,(data)=>{callback(data);});},off(eventName,callback){if(!this.socket){return;}
if(this.socketEventListeners.has(eventName)){const listeners=this.socketEventListeners.get(eventName);const index=listeners.indexOf(callback);if(index>-1){listeners.splice(index,1);}}
this.socket.off(eventName,callback);},_triggerEvent(eventName,data){if(this.socketEventListeners.has(eventName)){const listeners=this.socketEventListeners.get(eventName);listeners.forEach(callback=>{try{callback(data);}catch(error){console.error(`SypnexAPI [${this.appId}]: Error in event callback:`,error);}});}},getSocket(){return this.socket;},getSocketState(){return{connected:this.isSocketConnected(),appId:this.appId,url:this.socketUrl,autoReconnect:this.autoReconnect,reconnectAttempts:this.reconnectAttempts,roomsToRejoin:Array.from(this.roomsToRejoin),healthChecks:this.enableHealthChecks,socket:this.socket?{id:this.socket.id,connected:this.socket.connected,disconnected:this.socket.disconnected}:null};},startHealthChecks(){if(!this.enableHealthChecks||this.healthCheckTimer){return;}
this.healthCheckTimer=setInterval(()=>{this.performHealthCheck();},this.healthCheckInterval);},stopHealthChecks(){if(this.healthCheckTimer){clearInterval(this.healthCheckTimer);this.healthCheckTimer=null;}},async performHealthCheck(){if(!this.isSocketConnected()){return;}
try{const pingTime=await this.ping();}catch(error){console.warn(`SypnexAPI [${this.appId}]: Health check failed:`,error.message);}},setHealthChecks(enabled){this.enableHealthChecks=enabled;if(enabled&&this.isSocketConnected()){this.startHealthChecks();}else{this.stopHealthChecks();}},setHealthCheckInterval(intervalMs){this.healthCheckInterval=intervalMs;if(this.healthCheckTimer){this.stopHealthChecks();this.startHealthChecks();}},setAutoReconnect(enabled){this.autoReconnect=enabled;if(this.socket){this.socket.io.reconnection(enabled);}},setReconnectConfig(config){if(config.maxAttempts!==undefined){this.maxReconnectAttempts=config.maxAttempts;}
if(config.delay!==undefined){this.reconnectDelay=config.delay;}
if(config.maxDelay!==undefined){this.maxReconnectDelay=config.maxDelay;}
if(this.socket){this.socket.io.reconnectionAttempts(this.maxReconnectAttempts);this.socket.io.reconnectionDelay(this.reconnectDelay);this.socket.io.reconnectionDelayMax(this.maxReconnectDelay);}},reconnect(){if(this.socket){this.manualDisconnect=false;this.socket.connect();}},_scheduleReconnect(){if(this.reconnectAttempts>=this.maxReconnectAttempts){console.error(`SypnexAPI [${this.appId}]: Max reconnection attempts reached`);return;}
this.reconnectAttempts++;const delay=Math.min(this.reconnectDelay*Math.pow(2,this.reconnectAttempts-1),this.maxReconnectDelay);this.reconnectTimer=setTimeout(()=>{if(this.socket&&!this.socket.connected&&!this.manualDisconnect){this.socket.connect();}},delay);},_rejoinRooms(){if(this.roomsToRejoin.size===0){return;}
this.roomsToRejoin.forEach(roomName=>{try{this.socket.emit('join_room',{room:roomName,appId:this.appId});}catch(error){console.error(`SypnexAPI [${this.appId}]: Error rejoining room '${roomName}':`,error);}});}});Object.assign(SypnexAPI.prototype,{async getVirtualFileStats(){try{const response=await fetch(`${this.baseUrl}/virtual-files/stats`);if(response.ok){return await response.json();}else{throw new Error(`Failed to get stats: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error getting virtual file stats:`,error);throw error;}},async listVirtualFiles(path='/'){try{const response=await fetch(`${this.baseUrl}/virtual-files/list?path=${encodeURIComponent(path)}`);if(response.ok){return await response.json();}else{throw new Error(`Failed to list files: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error listing virtual files:`,error);throw error;}},async createVirtualFolder(name,parentPath='/'){try{const response=await fetch(`${this.baseUrl}/virtual-files/create-folder`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify({name,parent_path:parentPath})});if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to create folder: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error creating virtual folder:`,error);throw error;}},async createVirtualFile(name,content='',parentPath='/'){try{const response=await fetch(`${this.baseUrl}/virtual-files/create-file`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify({name,content,parent_path:parentPath})});if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to create file: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error creating virtual file:`,error);throw error;}},async uploadVirtualFile(file,parentPath='/'){try{const formData=new FormData();formData.append('file',file);formData.append('parent_path',parentPath);const response=await fetch(`${this.baseUrl}/virtual-files/upload-file-streaming`,{method:'POST',body:formData});if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to upload file: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error uploading virtual file:`,error);throw error;}},uploadVirtualFileChunked(file,parentPath='/',progressCallback=null){try{if(progressCallback)progressCallback(0);const formData=new FormData();formData.append('file',file);formData.append('parent_path',parentPath);let xhr=null;const promise=new Promise((resolve,reject)=>{xhr=new XMLHttpRequest();xhr.upload.addEventListener('progress',(event)=>{if(event.lengthComputable&&progressCallback){const percentComplete=Math.round((event.loaded/event.total)*100);progressCallback(percentComplete);}});xhr.addEventListener('load',()=>{if(xhr.status>=200&&xhr.status<300){try{const result=JSON.parse(xhr.responseText);if(progressCallback)progressCallback(100);resolve(result);}catch(parseError){reject(new Error('Invalid JSON response from server'));}}else{try{const errorData=JSON.parse(xhr.responseText);reject(new Error(errorData.error||`Upload failed with status: ${xhr.status}`));}catch(parseError){reject(new Error(`Upload failed with status: ${xhr.status}`));}}});xhr.addEventListener('error',()=>{reject(new Error('Network error during upload'));});xhr.addEventListener('abort',()=>{reject(new Error('Upload cancelled by user'));});xhr.open('POST',`${this.baseUrl}/virtual-files/upload-file-streaming`);xhr.send(formData);});return{promise:promise,abort:()=>{if(xhr){xhr.abort();}}};}catch(error){console.error(`SypnexAPI [${this.appId}]: Error uploading chunked file:`,error);throw error;}},async readVirtualFile(filePath){try{const response=await fetch(`${this.baseUrl}/virtual-files/read/${encodeURIComponent(filePath.substring(1))}`);if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to read file: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error reading virtual file:`,error);throw error;}},async readVirtualFileText(filePath){try{const fileData=await this.readVirtualFile(filePath);return fileData.content||'';}catch(error){console.error(`SypnexAPI [${this.appId}]: Error reading virtual file text:`,error);throw error;}},async readVirtualFileJSON(filePath){try{const content=await this.readVirtualFileText(filePath);return JSON.parse(content);}catch(error){console.error(`SypnexAPI [${this.appId}]: Error reading virtual file JSON:`,error);throw error;}},async readVirtualFileBlob(filePath){try{const fileUrl=this.getVirtualFileUrl(filePath);const response=await fetch(fileUrl);if(!response.ok){throw new Error(`Failed to fetch binary file: ${response.status} ${response.statusText}`);}
return await response.blob();}catch(error){console.error(`SypnexAPI [${this.appId}]: Error reading virtual file blob:`,error);throw error;}},getVirtualFileUrl(filePath){return`${this.baseUrl}/virtual-files/serve/${encodeURIComponent(filePath.substring(1))}`;},async deleteVirtualItem(itemPath){try{const response=await fetch(`${this.baseUrl}/virtual-files/delete/${encodeURIComponent(itemPath.substring(1))}`,{method:'DELETE'});if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to delete item: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error deleting virtual item:`,error);throw error;}},async getVirtualItemInfo(itemPath){try{const response=await fetch(`${this.baseUrl}/virtual-files/info/${encodeURIComponent(itemPath.substring(1))}`);if(response.ok){return await response.json();}else{if(response.status===404){const notFoundError=new Error('Item not found');notFoundError.isNotFound=true;notFoundError.status=404;throw notFoundError;}
const errorData=await response.json();const error=new Error(errorData.error||`Failed to get item info: ${response.status}`);error.status=response.status;throw error;}}catch(error){if(!error.isNotFound&&error.status!==404){console.error(`SypnexAPI [${this.appId}]: Error getting virtual item info:`,error);}
throw error;}},async virtualItemExists(itemPath){try{await this.getVirtualItemInfo(itemPath);return true;}catch(error){if(error.isNotFound||error.status===404){return false;}
throw error;}},async writeVirtualFile(filePath,content){try{const response=await fetch(`${this.baseUrl}/virtual-files/write${filePath}`,{method:'PUT',headers:{'Content-Type':'application/json',},body:JSON.stringify({content})});if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to write file: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error writing virtual file:`,error);throw error;}},async writeVirtualFileJSON(filePath,data){try{const content=JSON.stringify(data,null,2);return await this.writeVirtualFile(filePath,content);}catch(error){console.error(`SypnexAPI [${this.appId}]: Error writing virtual file JSON:`,error);throw error;}},async writeVirtualFileBinary(filePath,binaryData){try{const exists=await this.virtualItemExists(filePath);if(exists){await this.deleteVirtualItem(filePath);}
const pathParts=filePath.split('/');const fileName=pathParts.pop();const parentPath=pathParts.length>0?pathParts.join('/')||'/':'/';const formData=new FormData();let blob;if(binaryData instanceof Uint8Array){blob=new Blob([binaryData],{type:'application/octet-stream'});}else if(binaryData instanceof Blob){blob=binaryData;}else{throw new Error('Binary data must be Uint8Array or Blob');}
formData.append('file',blob,fileName);formData.append('parent_path',parentPath);const response=await fetch(`${this.baseUrl}/virtual-files/upload-file`,{method:'POST',body:formData});if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to upload binary file: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error writing virtual file binary:`,error);throw error;}},async createVirtualDirectoryStructure(dirPath){try{const pathParts=dirPath.split('/').filter(part=>part.length>0);let currentPath='/';for(const part of pathParts){const fullPath=currentPath==='/'?`/${part}`:`${currentPath}/${part}`;const exists=await this.virtualItemExists(fullPath);if(!exists){const parentPath=currentPath;await this.createVirtualFolder(part,parentPath);}
currentPath=fullPath;}
return{success:true,path:dirPath};}catch(error){console.error(`SypnexAPI [${this.appId}]: Error creating directory structure:`,error);throw error;}}});Object.assign(SypnexAPI.prototype,{async loadLibrary(url,options={}){const{localName=null,timeout=10000}=options;return new Promise((resolve,reject)=>{const timeoutId=setTimeout(()=>{reject(new Error(`Library load timeout: ${url}`));},timeout);const script=document.createElement('script');script.src=url;script.onload=()=>{clearTimeout(timeoutId);if(localName&&window[localName]){resolve(window[localName]);}else{resolve(true);}};script.onerror=()=>{clearTimeout(timeoutId);reject(new Error(`Failed to load library: ${url}`));};document.head.appendChild(script);});},});Object.assign(SypnexAPI.prototype,{async showFileExplorer(options={}){const{mode='open',title=mode==='open'?'Open File':'Save File',initialPath='/',fileName='',fileExtension='',onSelect=null,onCancel=null}=options;return new Promise((resolve)=>{const modal=document.createElement('div');modal.className='sypnex-file-explorer-modal';modal.innerHTML=`
                <div class="sypnex-file-explorer-container">
                    <div class="sypnex-file-explorer-header">
                        <h3><i class="fas fa-folder-open" style="color: var(--accent-color);"></i> ${title}</h3>
                        <button class="sypnex-file-explorer-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                        
                        <div class="sypnex-file-explorer-toolbar">
                            <div class="sypnex-file-explorer-path">
                                <i class="fas fa-folder"></i>
                                <span class="sypnex-file-explorer-path-text">${initialPath}</span>
                            </div>
                            <div class="sypnex-file-explorer-hint">
                                <i class="fas fa-info-circle"></i> Click folders to navigate, click files to select
                            </div>
                            <div class="sypnex-file-explorer-actions">
                                <button class="sypnex-file-explorer-btn sypnex-file-explorer-new-folder">
                                    <i class="fas fa-folder-plus"></i> New Folder
                                </button>
                                <button class="sypnex-file-explorer-btn sypnex-file-explorer-refresh">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
                            </div>
                        </div>
                        
                        <div class="sypnex-file-explorer-content">
                            <div class="sypnex-file-explorer-main">
                                <div class="sypnex-file-explorer-breadcrumb">
                                    <span class="sypnex-file-explorer-breadcrumb-item" data-path="/">Root</span>
                                </div>
                                
                                <div class="sypnex-file-explorer-list">
                                    <div class="sypnex-file-explorer-loading">
                                        <i class="fas fa-spinner fa-spin"></i> Loading...
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${mode === 'save' ? `<div class="sypnex-file-explorer-save-section"><label for="sypnex-file-explorer-filename">File Name:</label><input type="text"id="sypnex-file-explorer-filename"class="sypnex-file-explorer-input"
value="${fileName}"placeholder="Enter filename${fileExtension ? ' (required: ' + fileExtension + ')' : ''}"></div>` : ''}
                        
                        <div class="sypnex-file-explorer-footer">
                            <button class="sypnex-file-explorer-btn sypnex-file-explorer-btn-secondary sypnex-file-explorer-cancel">
                                Cancel
                            </button>
                            <button class="sypnex-file-explorer-btn sypnex-file-explorer-btn-primary sypnex-file-explorer-select" disabled>
                                ${mode === 'open' ? 'Open' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            `;document.body.appendChild(modal);if(!document.getElementById('sypnex-file-explorer-styles')){const style=document.createElement('style');style.id='sypnex-file-explorer-styles';style.textContent=`
                    .sypnex-file-explorer-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        z-index: 1000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        box-sizing: border-box;
                        background: rgba(0, 0, 0, 0.5);
                        backdrop-filter: blur(4px);
                    }
                    
                    .sypnex-file-explorer-overlay {
                        display: none;
                    }
                    
                    .sypnex-file-explorer-container {
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        border-radius: 12px;
                        width: 100%;
                        max-width: 800px;
                        max-height: 90vh;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                        backdrop-filter: blur(10px);
                        margin: 5% auto;
                        position: relative;
                    }
                    
                    .sypnex-file-explorer-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        border-radius: 12px 12px 0 0;
                    }
                    
                    .sypnex-file-explorer-header h3 {
                        margin: 0;
                        color: var(--text-primary);
                        font-size: 1.1em;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .sypnex-file-explorer-close {
                        background: none;
                        border: none;
                        color: var(--text-secondary);
                        font-size: 20px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                    }
                    
                    .sypnex-file-explorer-close:hover {
                        background: rgba(255, 71, 87, 0.1);
                        color: #ff4757;
                    }
                    
                    .sypnex-file-explorer-toolbar {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        min-height: 60px;
                    }
                    
                    .sypnex-file-explorer-hint {
                        color: var(--text-secondary);
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        flex: 1;
                        justify-content: center;
                        white-space: nowrap;
                    }
                    
                    .sypnex-file-explorer-path {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        color: var(--text-secondary);
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                        font-size: 14px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-actions {
                        display: flex;
                        gap: 10px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-btn {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        color: var(--text-primary);
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        font-weight: 500;
                        min-width: 120px;
                        justify-content: center;
                    }
                    
                    .sypnex-file-explorer-btn:hover {
                        background: rgba(0, 212, 255, 0.1);
                        border-color: var(--accent-color);
                        box-shadow: 0 2px 8px rgba(0, 212, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-btn:active {
                        background: rgba(0, 212, 255, 0.15);
                        box-shadow: 0 1px 4px rgba(0, 212, 255, 0.3);
                    }
                    
                    .sypnex-file-explorer-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        box-shadow: none;
                    }
                    
                    .sypnex-file-explorer-btn-primary {
                        background: var(--accent-color);
                        color: white;
                        font-weight: 600;
                    }
                    
                    .sypnex-file-explorer-btn-primary:hover:not(:disabled) {
                        background: var(--accent-hover);
                    }
                    
                    .sypnex-file-explorer-btn-secondary {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(255, 255, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-btn-secondary:hover:not(:disabled) {
                        background: rgba(255, 255, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-content {
                        display: flex;
                        flex: 1;
                        min-height: 300px;
                        max-height: calc(90vh - 200px);
                        overflow: hidden;
                    }
                    
                    .sypnex-file-explorer-main {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .sypnex-file-explorer-breadcrumb {
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                    }
                    
                    .sypnex-file-explorer-breadcrumb-item {
                        color: var(--accent-color);
                        cursor: pointer;
                        transition: color 0.2s ease;
                    }
                    
                    .sypnex-file-explorer-breadcrumb-item:hover {
                        color: var(--accent-hover);
                    }
                    
                    .sypnex-file-explorer-list {
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px;
                        max-height: 100%;
                    }
                    
                    .sypnex-file-explorer-loading {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        color: var(--text-secondary);
                        padding: 40px;
                    }
                    
                    .sypnex-file-explorer-item {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        padding: 12px;
                        cursor: pointer;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        margin-bottom: 5px;
                    }
                    
                    .sypnex-file-explorer-item:hover {
                        background: rgba(0, 212, 255, 0.1);
                    }
                    
                    .sypnex-file-explorer-item.selected {
                        background: rgba(0, 212, 255, 0.2);
                        border: 1px solid var(--accent-color);
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"] .sypnex-file-explorer-item-icon {
                        color: #ffd700;
                    }
                    
                    .sypnex-file-explorer-item-icon {
                        width: 20px;
                        text-align: center;
                        color: var(--accent-color);
                    }
                    
                    .sypnex-file-explorer-item-arrow {
                        color: var(--text-secondary);
                        font-size: 12px;
                        opacity: 0.7;
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"]:hover .sypnex-file-explorer-item-arrow {
                        color: var(--accent-color);
                        opacity: 1;
                    }
                    
                    .sypnex-file-explorer-item-name {
                        flex: 1;
                        color: var(--text-primary);
                        font-size: 14px;
                    }
                    
                    .sypnex-file-explorer-item-size {
                        color: var(--text-secondary);
                        font-size: 12px;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                    }
                    
                    .sypnex-file-explorer-save-section {
                        padding: 20px;
                        border-top: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-save-section label {
                        display: block;
                        margin-bottom: 10px;
                        color: var(--text-primary);
                        font-weight: 500;
                    }
                    
                    .sypnex-file-explorer-input {
                        width: 100%;
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        color: var(--text-primary);
                        padding: 10px 15px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                        transition: all 0.2s ease;
                        outline: none;
                    }
                    
                    .sypnex-file-explorer-input:focus {
                        border-color: var(--accent-color);
                        background: rgba(0, 212, 255, 0.05);
                    }
                    
                    .sypnex-file-explorer-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        padding: 20px;
                        border-top: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        border-radius: 0 0 12px 12px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-empty {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--text-secondary);
                        padding: 40px;
                        font-style: italic;
                    }
                    
                    /* Responsive Design */
                    @media (max-width: 768px) {
                        .sypnex-file-explorer-modal {
                            padding: 10px;
                            align-items: flex-start;
                            padding-top: 20px;
                        }
                        
                        .sypnex-file-explorer-container {
                            max-width: 100%;
                            max-height: calc(100vh - 40px);
                            margin: 0;
                        }
                        
                        .sypnex-file-explorer-header {
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-header h3 {
                            font-size: 1em;
                        }
                        
                        .sypnex-file-explorer-toolbar {
                            flex-direction: column;
                            gap: 10px;
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-hint {
                            order: -1;
                            font-size: 11px;
                        }
                        
                        .sypnex-file-explorer-actions {
                            justify-content: center;
                        }
                        
                        .sypnex-file-explorer-btn {
                            padding: 6px 12px;
                            font-size: 13px;
                        }
                        
                        .sypnex-file-explorer-breadcrumb,
                        .sypnex-file-explorer-save-section {
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-footer {
                            padding: 15px;
                            flex-direction: column;
                            gap: 8px;
                        }
                        
                        .sypnex-file-explorer-footer button {
                            width: 100%;
                        }
                    }
                `;document.head.appendChild(style);}
document.body.appendChild(modal);const pathText=modal.querySelector('.sypnex-file-explorer-path-text');const breadcrumb=modal.querySelector('.sypnex-file-explorer-breadcrumb');const fileList=modal.querySelector('.sypnex-file-explorer-list');const selectBtn=modal.querySelector('.sypnex-file-explorer-select');const cancelBtn=modal.querySelector('.sypnex-file-explorer-cancel');const filenameInput=modal.querySelector('#sypnex-file-explorer-filename');const refreshBtn=modal.querySelector('.sypnex-file-explorer-refresh');const newFolderBtn=modal.querySelector('.sypnex-file-explorer-new-folder');let currentPath=initialPath;let selectedItem=null;async function loadDirectory(path,isRefresh=false){try{if(isRefresh){const existingContent=fileList.innerHTML;if(!fileList.querySelector('.sypnex-file-explorer-refresh-overlay')){const overlay=document.createElement('div');overlay.className='sypnex-file-explorer-refresh-overlay';overlay.style.cssText=`
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: rgba(0, 0, 0, 0.1);
                                backdrop-filter: blur(1px);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                z-index: 10;
                                opacity: 0;
                                transition: opacity 0.2s ease;
                            `;overlay.innerHTML='<div style="color: var(--text-secondary); font-size: 12px;"><i class="fas fa-sync-alt fa-spin"></i> Updating...</div>';fileList.style.position='relative';fileList.appendChild(overlay);setTimeout(()=>overlay.style.opacity='1',10);}}else{fileList.innerHTML='<div class="sypnex-file-explorer-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';}
const response=await this.listVirtualFiles(path);let items=[];if(Array.isArray(response)){items=response;}else if(response&&Array.isArray(response.items)){items=response.items;}else if(response&&typeof response==='object'){items=Object.values(response);}
if(!items||items.length===0){fileList.innerHTML='<div class="sypnex-file-explorer-empty">This directory is empty</div>';fileList.style.position='';return;}
if(!Array.isArray(items)){console.error('Items is not an array:',items);fileList.innerHTML='<div class="sypnex-file-explorer-empty">Error: Invalid response format</div>';fileList.style.position='';return;}
const sortedItems=items.sort((a,b)=>{const aIsDir=a.type==='directory'||a.is_directory;const bIsDir=b.type==='directory'||b.is_directory;if(aIsDir&&!bIsDir)return-1;if(!aIsDir&&bIsDir)return 1;return a.name.localeCompare(b.name);});fileList.innerHTML=sortedItems.map(item=>{const isDirectory=item.type==='directory'||item.is_directory;const icon=isDirectory?'fa-folder':'fa-file';const size=isDirectory?'':this._formatFileSize(item.size||0);const itemPath=path==='/'?`/${item.name}`:`${path}/${item.name}`;return`
                            <div class="sypnex-file-explorer-item" data-path="${itemPath}" data-type="${isDirectory ? 'directory' : 'file'}" data-name="${item.name}">
                                <div class="sypnex-file-explorer-item-icon">
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div class="sypnex-file-explorer-item-name">${item.name}</div>
                                <div class="sypnex-file-explorer-item-size">${size}</div>
                                ${isDirectory ? '<div class="sypnex-file-explorer-item-arrow"><i class="fas fa-chevron-right"></i></div>' : ''}
                            </div>
                        `;}).join('');fileList.style.position='';updateBreadcrumb(path);}catch(error){console.error('Error loading directory:',error);fileList.innerHTML='<div class="sypnex-file-explorer-empty">Error loading directory</div>';fileList.style.position='';}}
function updateBreadcrumb(path){const parts=path.split('/').filter(part=>part.length>0);let breadcrumbHTML='<span class="sypnex-file-explorer-breadcrumb-item" data-path="/">Root</span>';let currentPath='';parts.forEach((part,index)=>{currentPath+=`/${part}`;const isLast=index===parts.length-1;breadcrumbHTML+=` / <span class="sypnex-file-explorer-breadcrumb-item" data-path="${currentPath}" ${isLast ? 'style="color: var(--text-primary, #ffffff);"' : ''}>${part}</span>`;});breadcrumb.innerHTML=breadcrumbHTML;}
this._formatFileSize=function(bytes){if(bytes===0)return'0 B';const k=1024;const sizes=['B','KB','MB','GB'];const i=Math.floor(Math.log(bytes)/Math.log(k));return parseFloat((bytes/Math.pow(k,i)).toFixed(1))+' '+sizes[i];};if(fileList){fileList.addEventListener('click',async(e)=>{const item=e.target.closest('.sypnex-file-explorer-item');if(!item)return;const itemPath=item.dataset.path;const itemType=item.dataset.type;const itemName=item.dataset.name;if(itemType==='directory'){currentPath=itemPath;if(pathText)pathText.textContent=currentPath;await loadDirectory.call(this,currentPath);}else{document.querySelectorAll('.sypnex-file-explorer-item').forEach(el=>el.classList.remove('selected'));item.classList.add('selected');selectedItem={path:itemPath,name:itemName,type:itemType};if(mode==='save'&&filenameInput){filenameInput.value=itemName;}
if(selectBtn)selectBtn.disabled=false;}});}
if(breadcrumb){breadcrumb.addEventListener('click',async(e)=>{const breadcrumbItem=e.target.closest('.sypnex-file-explorer-breadcrumb-item');if(!breadcrumbItem)return;const path=breadcrumbItem.dataset.path;currentPath=path;if(pathText)pathText.textContent=currentPath;await loadDirectory.call(this,currentPath);});}
if(refreshBtn){refreshBtn.addEventListener('click',async()=>{const icon=refreshBtn.querySelector('i');const originalClasses=icon.className;icon.className='fas fa-sync-alt fa-spin';refreshBtn.disabled=true;refreshBtn.style.opacity='0.7';try{await loadDirectory.call(this,currentPath,true);}finally{icon.className=originalClasses;refreshBtn.disabled=false;refreshBtn.style.opacity='';}});}
if(newFolderBtn){newFolderBtn.addEventListener('click',async()=>{const folderName=await this.showInputModal('Create New Folder','Enter folder name:',{placeholder:'e.g., My Documents',confirmText:'Create',icon:'fas fa-folder-plus'});if(!folderName)return;try{await this.createVirtualFolder(folderName,currentPath);await loadDirectory.call(this,currentPath);this.showNotification(`Folder "${folderName}" created successfully`,'success');}catch(error){this.showNotification(`Failed to create folder: ${error.message}`,'error');}});}
if(selectBtn){selectBtn.addEventListener('click',()=>{let selectedPath=null;if(mode==='open'){if(selectedItem){selectedPath=selectedItem.path;}}else{const filename=filenameInput?filenameInput.value.trim():'';if(!filename){this.showNotification('Please enter a filename','warning');return;}
if(fileExtension&&!filename.endsWith(fileExtension)){this.showNotification(`Filename must end with ${fileExtension}`,'warning');return;}
selectedPath=currentPath==='/'?`/${filename}`:`${currentPath}/${filename}`;}
if(selectedPath){if(onSelect)onSelect(selectedPath);resolve(selectedPath);}else{this.showNotification('Please select a file','warning');return;}
modal.remove();});}
if(cancelBtn){cancelBtn.addEventListener('click',()=>{if(onCancel)onCancel();resolve(null);modal.remove();});}
const closeBtn=modal.querySelector('.sypnex-file-explorer-close');if(closeBtn){closeBtn.addEventListener('click',()=>{if(onCancel)onCancel();resolve(null);modal.remove();});}
if(filenameInput&&selectBtn){filenameInput.addEventListener('input',()=>{const filename=filenameInput.value.trim();selectBtn.disabled=!filename;});}
loadDirectory.call(this,currentPath);});}});Object.assign(SypnexAPI.prototype,{async writeLog(logData){try{if(!logData.level||!logData.message||!logData.component){throw new Error('Missing required fields: level, message, component');}
if(!logData.source){logData.source=this.appId||'unknown';}
const response=await fetch(`${this.baseUrl}/logs/write`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)});if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(`Failed to write log: ${errorData.error || response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error writing log:`,error);throw error;}},async logDebug(message,details={}){return this.writeLog({level:'debug',message:message,component:'user-apps',source:this.appId,details:details});},async logInfo(message,details={}){return this.writeLog({level:'info',message:message,component:'user-apps',source:this.appId,details:details});},async logWarn(message,details={}){return this.writeLog({level:'warn',message:message,component:'user-apps',source:this.appId,details:details});},async logError(message,details={}){return this.writeLog({level:'error',message:message,component:'user-apps',source:this.appId,details:details});},async logCritical(message,details={}){return this.writeLog({level:'critical',message:message,component:'user-apps',source:this.appId,details:details});},async readLogs(filters={}){try{const params=new URLSearchParams();if(filters.component)params.append('component',filters.component);if(filters.level)params.append('level',filters.level);if(filters.date)params.append('date',filters.date);if(filters.limit)params.append('limit',filters.limit.toString());if(filters.source)params.append('source',filters.source);const response=await fetch(`${this.baseUrl}/logs/read?${params.toString()}`);if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(`Failed to read logs: ${errorData.error || response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error reading logs:`,error);throw error;}},async getLogDates(){try{const response=await fetch(`${this.baseUrl}/logs/dates`);if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(`Failed to get log dates: ${errorData.error || response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error getting log dates:`,error);throw error;}},async clearLogs(filters={}){try{const params=new URLSearchParams();if(filters.component)params.append('component',filters.component);if(filters.date)params.append('date',filters.date);const response=await fetch(`${this.baseUrl}/logs/clear?${params.toString()}`,{method:'DELETE'});if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(`Failed to clear logs: ${errorData.error || response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error clearing logs:`,error);throw error;}},async getLogStats(){try{const response=await fetch(`${this.baseUrl}/logs/stats`);if(response.ok){return await response.json();}else{const errorData=await response.json();throw new Error(`Failed to get log stats: ${errorData.error || response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error getting log stats:`,error);throw error;}},async getMyLogs(filters={}){return this.readLogs({...filters,source:this.appId,component:'user-apps'});}});if(typeof window!=='undefined'){window.SypnexLogs={async readLogs(filters={}){const tempApi=new SypnexAPI('system-logs');return tempApi.readLogs(filters);},async getLogDates(){const tempApi=new SypnexAPI('system-logs');return tempApi.getLogDates();},async getLogStats(){const tempApi=new SypnexAPI('system-logs');return tempApi.getLogStats();},async clearLogs(filters={}){const tempApi=new SypnexAPI('system-logs');return tempApi.clearLogs(filters);}};}
Object.assign(SypnexAPI.prototype,{async getAvailableApps(){try{const response=await fetch(`${this.baseUrl}/updates/latest`);if(response.ok){return await response.json();}else{throw new Error(`Failed to get available apps: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error getting available apps:`,error);throw error;}},async getInstalledApps(){try{const response=await fetch(`${this.baseUrl}/apps`);if(response.ok){return await response.json();}else{throw new Error(`Failed to get installed apps: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error getting installed apps:`,error);throw error;}},async updateApp(appId,downloadUrl){try{if(!downloadUrl){throw new Error('Download URL is required for app update');}
const requestBody={download_url:downloadUrl};const fullUrl=`${this.baseUrl}/user-apps/update/${appId}`;const response=await fetch(fullUrl,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify(requestBody)});if(response.ok){const result=await response.json();return result;}else{const errorData=await response.json();throw new Error(errorData.error||`Update failed: ${response.status} ${response.statusText}: ${errorData.error || 'Unknown error'}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error updating app ${appId}:`,error);throw error;}},async refreshAppRegistry(){try{const response=await fetch(`${this.baseUrl}/user-apps/refresh`,{method:'POST',headers:{'Content-Type':'application/json',}});if(response.ok){const result=await response.json();return result;}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to refresh app registry: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error refreshing app registry:`,error);throw error;}},async installApp(appId,options={}){try{const{version}=options;const payload={app_id:appId};if(version){payload.version=version;}
const response=await fetch(`${this.baseUrl}/user-apps/install`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify(payload)});if(response.ok){const result=await response.json();return result;}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to install app: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error installing app ${appId}:`,error);throw error;}},async uninstallApp(appId){try{const response=await fetch(`${this.baseUrl}/user-apps/uninstall/${appId}`,{method:'DELETE',headers:{'Content-Type':'application/json',}});if(response.ok){const result=await response.json();return result;}else{const errorData=await response.json();throw new Error(errorData.error||`Failed to uninstall app: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error uninstalling app ${appId}:`,error);throw error;}}});Object.assign(SypnexAPI.prototype,{async proxyHTTP(options){const{url,method='GET',headers={},body=null,timeout=30,followRedirects=true,forceProxy=false}=options;if(!url){throw new Error('URL is required for HTTP proxy request');}
if(forceProxy){return await this._proxyThroughBackend(options);}
try{const result=await this._directCORSRequest(options);return result;}catch(corsError){const result=await this._proxyThroughBackend(options);return result;}},async _directCORSRequest(options){const{url,method='GET',headers={},body=null,timeout=30,followRedirects=true}=options;const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),timeout*1000);try{const fetchOptions={method:method.toUpperCase(),headers:{...headers},signal:controller.signal,mode:'cors',credentials:'omit',redirect:followRedirects?'follow':'manual'};if(body!==null&&body!==undefined&&['POST','PUT','PATCH','DELETE'].includes(method.toUpperCase())){if(typeof body==='object'&&!(body instanceof FormData)&&!(body instanceof ArrayBuffer)&&!(body instanceof Blob)){fetchOptions.body=JSON.stringify(body);if(!fetchOptions.headers['Content-Type']&&!fetchOptions.headers['content-type']){fetchOptions.headers['Content-Type']='application/json';}}else{fetchOptions.body=body;}}
const response=await fetch(url,fetchOptions);clearTimeout(timeoutId);if(!response.ok&&(response.type==='opaque'||response.type==='cors')){throw new Error(`CORS request failed with status ${response.status}`);}
if(response.status===0){throw new Error('Network request failed - likely CORS issue');}
const contentType=response.headers.get('content-type')||'';const isBinary=contentType.includes('audio/')||contentType.includes('video/')||contentType.includes('image/')||contentType.includes('application/octet-stream')||contentType.includes('application/pdf');let content;if(isBinary){const arrayBuffer=await response.arrayBuffer();const bytes=new Uint8Array(arrayBuffer);let binary='';for(let i=0;i<bytes.byteLength;i++){binary+=String.fromCharCode(bytes[i]);}
content=btoa(binary);}else{content=await response.text();if(contentType.includes('application/json')){try{content=JSON.parse(content);}catch(e){}}}
return{status:response.status,content:content,is_binary:isBinary,headers:Object.fromEntries(response.headers.entries())};}catch(fetchError){clearTimeout(timeoutId);if(fetchError.name==='AbortError'){throw new Error(`Request timeout after ${timeout} seconds`);}
throw fetchError;}},async _proxyThroughBackend(options){try{const{url,method='GET',headers={},body=null,timeout=30,followRedirects=true}=options;const proxyRequest={url,method:method.toUpperCase(),headers,timeout,followRedirects};if(body!==null&&body!==undefined){proxyRequest.body=body;}
const response=await fetch(`${this.baseUrl}/proxy/http`,{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify(proxyRequest)});if(response.ok){const result=await response.json();return result;}else{const errorData=await response.json();throw new Error(errorData.error||`Proxy request failed: ${response.status}`);}}catch(error){console.error(`SypnexAPI [${this.appId}]: Error in backend proxy request:`,error);return{status:0,error:error.message,content:null,is_binary:false};}},async proxyGET(url,options={}){return await this.proxyHTTP({url,method:'GET',...options});},async proxyPOST(url,body,options={}){return await this.proxyHTTP({url,method:'POST',body,...options});},async proxyPUT(url,body,options={}){return await this.proxyHTTP({url,method:'PUT',body,...options});},async proxyDELETE(url,options={}){return await this.proxyHTTP({url,method:'DELETE',...options});},async proxyJSON(url,options={}){const{method='GET',data=null,headers={},timeout=30}=options;const requestOptions={url,method,headers:{'Content-Type':'application/json',...headers},timeout};if(data&&(method==='POST'||method==='PUT'||method==='PATCH')){requestOptions.body=data;}
return await this.proxyHTTP(requestOptions);}});Object.assign(SypnexAPI.prototype,{async llmComplete(options){try{const{provider,endpoint,apiKey,model,messages,temperature=0.7,maxTokens=1000,stream=false}=options;if(!provider||!endpoint||!model||!messages){throw new Error('Missing required parameters: provider, endpoint, model, messages');}
if(!Array.isArray(messages)||messages.length===0){throw new Error('Messages must be a non-empty array');}
const formattedRequest=this._formatLLMRequest(provider,{model,messages,temperature,maxTokens,stream});const headers=this._getLLMHeaders(provider,apiKey);const proxyRequest={url:endpoint,method:'POST',headers:headers,body:formattedRequest,timeout:60};const response=await this.proxyHTTP(proxyRequest);if(!response||response.status<200||response.status>=300){throw new Error(`LLM API request failed: ${response?.status || 'Unknown error'}`);}
let responseData;if(typeof response.content==='string'){responseData=JSON.parse(response.content);}else{responseData=response.content;}
const normalizedResponse=this._normalizeLLMResponse(provider,responseData);return{...normalizedResponse,provider:provider};}catch(error){console.error('SypnexAPI: LLM completion error:',error);throw error;}},_formatLLMRequest(provider,options){const{model,messages,temperature,maxTokens,stream}=options;switch(provider.toLowerCase()){case'openai':return{model:model,messages:messages,temperature:temperature,max_tokens:maxTokens,stream:stream};case'anthropic':const anthropicMessages=[];let systemMessage=null;for(const msg of messages){if(msg.role==='system'){systemMessage=msg.content;}else{anthropicMessages.push({role:msg.role,content:msg.content});}}
const anthropicRequest={model:model,messages:anthropicMessages,max_tokens:maxTokens,temperature:temperature,stream:stream};if(systemMessage){anthropicRequest.system=systemMessage;}
return anthropicRequest;case'google':const contents=[];let systemInstruction=null;for(const msg of messages){if(msg.role==='system'){systemInstruction=msg.content;}else if(msg.role==='user'){contents.push({role:'user',parts:[{text:msg.content}]});}else if(msg.role==='assistant'){contents.push({role:'model',parts:[{text:msg.content}]});}}
const googleRequest={contents:contents,generationConfig:{temperature:temperature,maxOutputTokens:maxTokens}};if(systemInstruction){googleRequest.systemInstruction={parts:[{text:systemInstruction}]};}
return googleRequest;case'ollama':return{model:model,messages:messages,stream:stream,options:{temperature:temperature,num_predict:maxTokens}};default:throw new Error(`Unsupported LLM provider: ${provider}`);}},_getLLMHeaders(provider,apiKey){const headers={'Content-Type':'application/json'};switch(provider.toLowerCase()){case'openai':if(apiKey){headers['Authorization']=`Bearer ${apiKey}`;}
break;case'anthropic':if(apiKey){headers['X-API-Key']=apiKey;headers['anthropic-version']='2023-06-01';}
break;case'google':if(apiKey){headers['X-goog-api-key']=apiKey;}
break;case'ollama':break;}
return headers;},_normalizeLLMResponse(provider,responseData){switch(provider.toLowerCase()){case'openai':return{content:responseData.choices?.[0]?.message?.content||'',model:responseData.model||'',usage:responseData.usage||{}};case'anthropic':const anthropicContent=responseData.content?.[0]?.text||'';return{content:anthropicContent,model:responseData.model||'',usage:responseData.usage||{}};case'google':const googleContent=responseData.candidates?.[0]?.content?.parts?.[0]?.text||'';return{content:googleContent,model:'google-model',usage:responseData.usageMetadata||{}};case'ollama':return{content:responseData.message?.content||'',model:responseData.model||'',usage:{prompt_tokens:responseData.prompt_eval_count||0,completion_tokens:responseData.eval_count||0,total_tokens:(responseData.prompt_eval_count||0)+(responseData.eval_count||0)}};default:return{content:JSON.stringify(responseData),model:'unknown',usage:{}};}}});