// ==========================================================================
// 🚨 Firebase 接続設定（プライベート固定お部屋版）
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, update, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB39eq-VQP8fZNjVdm7BnO7gKEMBibqqDo",
    authDomain: "hana-kehai-app.firebaseapp.com",
    databaseURL: "https://hana-kehai-app-default-rtdb.firebaseio.com", 
    projectId: "hana-kehai-app",
    storageBucket: "hana-kehai-app.firebasestorage.app",
    messagingSenderId: "144341858428",
    appId: "1:144341858428:web:3adb2679fad549895171f9"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 💡 ログインなしプライベート版用の固定ID設定（URLパラメータがあればそちらを優先）
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room') || 'private_room';
const myId = urlParams.get('myname') || 'user_a';

let myRef = ref(database, `rooms/${roomId}/users/${myId}`);
let roomRef = ref(database, `rooms/${roomId}/users`);

// ==========================================================================
// 🛠️ 共通で使う関数（エフェクト＆メッセージ保存）
// ==========================================================================

window.triggerEffect = function(emojis) {
    const effectLayer = document.getElementById('effect-layer');
    if (!effectLayer) return;
    
    const effectDiv = document.createElement('div');
    effectDiv.className = 'floating-effect';
    effectDiv.innerText = emojis;
    effectLayer.appendChild(effectDiv);
    setTimeout(() => { effectDiv.remove(); }, 2000);
};

window.saveDataToServer = function(messageText, effectEmoji) {
    if (!myRef) return;
    
    const statusElement = document.getElementById('my-current-status');
    if (statusElement) {
        statusElement.innerText = messageText;
    }
    
    update(myRef, {
        message: messageText,
        effect: effectEmoji || "",
        checked: false
    }).catch((error) => console.error("メッセージ保存エラー:", error));
};

window.openAvatarModal = function() { 
    if (typeof window.loadCustomAvatars === "function") window.loadCustomAvatars();
    const modal = document.getElementById('avatar-modal');
    if (modal) modal.style.display = 'flex'; 
};

window.closeAvatarModal = function() { 
    const modal = document.getElementById('avatar-modal');
    if (modal) modal.style.display = 'none'; 
};

// ==========================================================================
// 📡 リアルタイムデータ同期（自分と相手のデータを自動反映）
// ==========================================================================
if (roomRef) {
    onValue(roomRef, (snapshot) => {
        const allUsersData = snapshot.val();
        if (allUsersData) {
            // 👥 ① 相手のデータ
            const userNames = Object.keys(allUsersData);
            const partnerId = userNames.find(name => name !== myId);
            
            if (partnerId) {
                const partnerData = allUsersData[partnerId];
                
                const partnerTitle = document.querySelector('#partner-area h2');
                if (partnerTitle) partnerTitle.innerText = `${partnerId} のいま`;
                
                if (partnerData.avatar) {
                    const partnerImg = document.getElementById('partner-avatar');
                    if (partnerImg) partnerImg.src = partnerData.avatar;
                }
                if (partnerData.message) {
                    const partnerMsg = document.getElementById('partner-message');
                    if (partnerMsg) partnerMsg.innerText = partnerData.message;
                }
                if (partnerData.effect && partnerData.checked === false) {
                    window.triggerEffect(partnerData.effect);
                    update(ref(database, `rooms/${roomId}/users/${partnerId}`), { checked: true });
                }
            }

            // 🙋‍♀️ ② 自分のデータ
            if (myId && allUsersData[myId]) {
                const myData = allUsersData[myId];
                if (myData.avatar) {
                    const myPreview = document.getElementById('my-avatar-preview');
                    if (myPreview) myPreview.src = myData.avatar;
                }
                if (myData.message) {
                    const myStatus = document.getElementById('my-current-status');
                    if (myStatus) myStatus.innerText = myData.message;
                }
            }
        }
    });
}

// ==========================================================================
// 3. 状態ボタン＆メッセージ送信
// ==========================================================================
window.changeStatus = function(statusText) {
    let effect = "";
    if (statusText.includes('まったり')) effect = '☕️🍀🏠';
    else if (statusText.includes('勉強')) effect = '🔥💪😤';     
    else if (statusText.includes('パソコン')) effect = '💻👀⚡️';
    else if (statusText.includes('おやつ')) effect = '🍰🍩🧋';
    else if (statusText.includes('寝るね')) effect = '🌙💤⭐️';
    else if (statusText.includes('愛してる')) effect = '❤️❤️❤️';    
    else if (statusText.includes('大好き')) effect = '💖✨💘';  

    window.triggerEffect(effect);
    window.saveDataToServer(statusText, effect);
};

window.sendStatus = function() {
    const messageInput = document.getElementById('my-message-text');
    if (!messageInput || messageInput.value.trim() === "") {
        alert("メッセージを入力してね！");
        return;
    }
    const statusText = messageInput.value;
    const statusElement = document.getElementById('my-current-status');
    if (statusElement) statusElement.innerText = statusText;
    
    window.triggerEffect('✨🎉✨');
    window.saveDataToServer(statusText, '✨🎉✨');
    messageInput.value = "";
};

window.selectPresetAvatar = function(presetId, customSrc) {
    const finalAvatarSrc = customSrc || `image/${presetId}.png`;
    const myPreview = document.getElementById('my-avatar-preview');
    if (myPreview) myPreview.src = finalAvatarSrc;
    
    if (myRef) {
        update(myRef, { avatar: finalAvatarSrc })
            .catch((error) => console.error("保存エラー:", error));
    }
};

// ==========================================================================
// 🔍 写真拡大モーダルの魔法（高解像度で大きめに表示！）
// ==========================================================================
window.zoomPhoto = function(element) {
    const modal = document.getElementById('photo-zoom-modal');
    const zoomedImg = document.getElementById('zoomed-photo');
    if (modal && zoomedImg) {
        zoomedImg.src = element.src;
        // 💡 画面いっぱいに大きめで見やすくスタイル調整！
        zoomedImg.style.maxWidth = '90vw';
        zoomedImg.style.maxHeight = '80vh';
        zoomedImg.style.objectFit = 'contain';
        zoomedImg.style.borderRadius = '16px';
        
        modal.style.display = 'flex';
    }
};

window.closeZoomModal = function() {
    const modal = document.getElementById('photo-zoom-modal');
    if (modal) modal.style.display = 'none';
};

// ==========================================================================
// 📸 タブ切り替え機能
// ==========================================================================
window.switchTab = function(tabName) {
    const myArea = document.getElementById('my-area');
    const partnerArea = document.getElementById('partner-area');
    const tabMyBtn = document.getElementById('tab-my');
    const tabPartnerBtn = document.getElementById('tab-partner');

    if (tabName === 'my') {
        if (myArea) myArea.style.display = 'block';
        if (partnerArea) partnerArea.style.display = 'none';
        if (tabMyBtn) {
            tabMyBtn.style.color = '#4caf50';
            tabMyBtn.style.borderBottom = '3px solid #4caf50';
        }
        if (tabPartnerBtn) {
            tabPartnerBtn.style.color = '#888';
            tabPartnerBtn.style.borderBottom = '3px solid transparent';
        }
    } else {
        if (myArea) myArea.style.display = 'none';
        if (partnerArea) partnerArea.style.display = 'block';
        if (tabPartnerBtn) {
            tabPartnerBtn.style.color = '#4caf50';
            tabPartnerBtn.style.borderBottom = '3px solid #4caf50';
        }
        if (tabMyBtn) {
            tabMyBtn.style.color = '#888';
            tabMyBtn.style.borderBottom = '3px solid transparent';
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    if (typeof window.switchTab === 'function') {
        window.switchTab('partner');
    }
});

// ==========================================================================
// 🖼️ 画像圧縮＆カスタム枠機能（拡大用に画質・サイズを大幅アップ！）
// ==========================================================================
window.isEditMode = false;
window.currentEditingIndex = -1;

window.toggleCustomMode = function() {
    window.isEditMode = !window.isEditMode;
    const grid = document.getElementById('preset-avatar-grid');
    const button = document.getElementById('toggle-custom-mode');
    if (window.isEditMode) {
        if(grid) grid.classList.add('edit-mode');
        if(button) {
            button.innerText = "アバターを選ぶモードに戻る";
            button.style.backgroundColor = "#ff9800";
            button.style.boxShadow = "0 3px 0 #e68a00";
        }
    } else {
        if(grid) grid.classList.remove('edit-mode');
        if(button) {
            button.innerText = "⚙️ 6つの枠の写真をカスタムする";
            button.style.backgroundColor = "#888";
            button.style.boxShadow = "0 3px 0 #666";
        }
    }
};

window.handleAvatarClick = function(index, presetId) {
    if (window.isEditMode) {
        window.currentEditingIndex = index;
        const fileInput = document.getElementById('avatar-file-input');
        if (fileInput) fileInput.click(); 
    } else {
        const img = document.getElementById(`preset-img-${index}`);
        const customSrc = img ? img.src : null;
        window.selectPresetAvatar(presetId, customSrc);
        if (typeof window.closeAvatarModal === "function") window.closeAvatarModal();
    }
};

// 💡 拡大表示しても綺麗なように最大「500x500」ピクセルで高品質保存！
function compressImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            // 画質0.85の高画質で保存
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            callback(compressedDataUrl);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 📸 自分の写真をセットする魔法（サイズ500pxに拡大！）
window.uploadOwnPhoto = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        // 💡 500x500の高画質サイズに設定！
        compressImage(file, 500, 500, function(compressedDataUrl) {
            if (window.isEditMode && window.currentEditingIndex !== -1) {
                const index = window.currentEditingIndex;
                if (typeof database !== "undefined" && database) {
                    const customAvatarRef = ref(database, `rooms/${roomId}/users/${myId}/custom_avatars/custom_${index}`);
                    set(customAvatarRef, compressedDataUrl).then(() => {
                        alert(`${index}番目の枠をあなた専用に完全保存しました！`);
                        window.toggleCustomMode();
                        window.currentEditingIndex = -1;
                    }).catch((error) => console.error("保存エラー:", error));
                }
            } else {
                const myPreview = document.getElementById('my-avatar-preview');
                if (myPreview) myPreview.src = compressedDataUrl;
                
                if (myRef) {
                    update(myRef, { avatar: compressedDataUrl })
                        .then(() => {
                            console.log("高画質写真の更新完了！");
                            window.closeAvatarModal();
                        })
                        .catch((error) => {
                            console.error("保存エラー:", error);
                            window.closeAvatarModal();
                        });
                } else {
                    window.closeAvatarModal();
                }
            }
        });
    }
};

window.loadCustomAvatars = function() {
    if (typeof database !== "undefined" && database) {
        const customAvatarsRef = ref(database, `rooms/${roomId}/users/${myId}/custom_avatars`);
        onValue(customAvatarsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                for (let i = 1; i <= 6; i++) {
                    if (data[`custom_${i}`]) {
                        const presetImg = document.getElementById(`preset-img-${i}`);
                        if (presetImg) presetImg.src = data[`custom_${i}`];
                    }
                }
            }
        });
    }
};

// ==========================================================================
// ✏️ 文字カスタム＆画面初期化
// ==========================================================================
window.isTextEditMode = false;

window.toggleTextCustomMode = function() {
    window.isTextEditMode = !window.isTextEditMode;
    const button = document.getElementById('toggle-text-custom-mode');
    if (window.isTextEditMode) {
        if(button) {
            button.innerText = "文字を選ぶモードに戻る";
            button.style.backgroundColor = "#9c27b0";
            button.style.boxShadow = "0 3px 0 #7b1fa2";
        }
        alert("文字のカスタムモードになりました！変更したいボタンをポチッと押してね。");
    } else {
        if(button) {
            button.innerText = "⚙️ 7つの文字をカスタムする";
            button.style.backgroundColor = "#888";
            button.style.boxShadow = "0 3px 0 #666";
        }
    }
};

window.handleTextClick = function(index, defaultText) {
    if (window.isTextEditMode) {
        const currentBtn = document.getElementById(`status-btn-${index}`);
        const currentText = currentBtn ? currentBtn.innerText : defaultText;
        const newText = prompt(`【${index + 1}番目のボタン】新しい文字を入力してね：`, currentText);
        
        if (newText !== null && newText.trim() !== "") {
            if (typeof database !== "undefined" && database) {
                const textRef = ref(database, `rooms/${roomId}/users/${myId}/custom_texts/text_${index}`);
                set(textRef, newText).then(() => {
                    alert(`ボタンの文字を「${newText}」に完全保存しました！`);
                    if (currentBtn) currentBtn.innerText = newText;
                    window.toggleTextCustomMode();
                }).catch((error) => { console.error("文字保存エラー:", error); });
            }
        }
    } else {
        const currentBtn = document.getElementById(`status-btn-${index}`);
        const selectedText = currentBtn ? currentBtn.innerText : defaultText;
        
        if (typeof window.changeStatus === "function") {
            window.changeStatus(selectedText);
        } else if (typeof saveDataToServer === "function") {
            saveDataToServer(selectedText, "");
        }
    }
};

window.loadCustomTexts = function() {
    if (typeof database !== "undefined" && database) {
        const customTextsRef = ref(database, `rooms/${roomId}/users/${myId}/custom_texts`);
        onValue(customTextsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                for (let i = 0; i < 7; i++) {
                    if (data[`text_${i}`]) {
                        const btn = document.getElementById(`status-btn-${i}`);
                        if (btn) btn.innerText = data[`text_${i}`];
                    }
                }
            }
        });
    }
};

window.loadMyPrivateDataOnce = function() {
    if (typeof database !== "undefined" && database) {
        get(myRef).then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.avatar) {
                    const myPreview = document.getElementById('my-avatar-preview');
                    if (myPreview) myPreview.src = data.avatar;
                }
                if (data.message) {
                    const myStatus = document.getElementById('my-current-status');
                    if (myStatus) myStatus.innerText = data.message;
                }
            }
        });
    }
};

// 🎬 画面起動時に初期データを読み込む
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (typeof window.loadCustomAvatars === "function") window.loadCustomAvatars();
        if (typeof window.loadCustomTexts === "function") window.loadCustomTexts();
        if (typeof window.loadMyPrivateDataOnce === "function") window.loadMyPrivateDataOnce();
    }, 1000);
});