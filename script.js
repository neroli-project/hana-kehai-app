// ==========================================================================
// 🚨 Firebaseの機能をインターネットから読み込む設定（スッキリ修正版！）
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// 💡 update を追加して安全に更新できるようにしたよ！
import { getDatabase, ref, set, update, onValue, child, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ⚠️あなたの「秘密の鍵」
const firebaseConfig = {
    apiKey: "AIzaSyB39eq-VQP8fZNjVdm7BnO7gKEMBibqqDo",
    authDomain: "hana-kehai-app.firebaseapp.com",
    databaseURL: "https://hana-kehai-app-default-rtdb.firebaseio.com", 
    projectId: "hana-kehai-app",
    storageBucket: "hana-kehai-app.firebasestorage.app",
    messagingSenderId: "144341858428",
    appId: "1:144341858428:web:3adb2679fad549895171f9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ==========================================================================
// 👥 URLから「部屋名」と「自分の名前」を読み取る仕組み
// ==========================================================================
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room') || "default_room";
let myId = urlParams.get('myname') || "user1";

console.log(`現在の部屋: 【 ${roomId} 】 / あなたの名前: 【 ${myId} 】`);

// データベースの保存先
const myRef = ref(database, `rooms/${roomId}/users/${myId}`);
const roomRef = ref(database, `rooms/${roomId}/users`);

// ==========================================================================
// 🛠️ 共通で使う大事な関数
// ==========================================================================

// エフェクトを画面に出す関数
window.triggerEffect = function(emojis) {
    const effectLayer = document.getElementById('effect-layer');
    if (!effectLayer) return;
    
    const effectDiv = document.createElement('div');
    effectDiv.className = 'floating-effect';
    effectDiv.innerText = emojis;
    effectLayer.appendChild(effectDiv);
    setTimeout(() => { effectDiv.remove(); }, 2000);
};

// 💡 メッセージだけを安全に保存する関数（アバター写真を壊さない！）
window.saveDataToServer = function(messageText, effectEmoji) {
    if (!myRef) return;
    
    const statusElement = document.getElementById('my-current-status');
    if (statusElement) {
        statusElement.innerText = messageText;
    }
    
    // update でメッセージとエフェクトだけ送信！
    update(myRef, {
        message: messageText,
        effect: effectEmoji || "",
        checked: false
    }).catch((error) => console.error("Firebaseへの送信エラー:", error));
};

// ポップアップ開閉
window.openAvatarModal = function() { 
    if (typeof window.loadCustomAvatars === "function") {
        window.loadCustomAvatars();
    }
    const modal = document.getElementById('avatar-modal');
    if (modal) modal.style.display = 'flex'; 
};

window.closeAvatarModal = function() { 
    const modal = document.getElementById('avatar-modal');
    if (modal) modal.style.display = 'none'; 
};

// ==========================================================================
// 📡 部屋にいる「自分以外の人（相手）」を自動で見つけて画面に映す
// ==========================================================================
if (roomRef) {
    onValue(roomRef, (snapshot) => {
        const allUsersData = snapshot.val();
        if (allUsersData) {
            // 👥 ① 相手のデータを探す
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
                    // update で安全にチェック済みに変更！
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
// 3. 状態ボタンを押した時の処理
// ==========================================================================
window.changeStatus = function(statusText) {
    let effect = "";
    if (statusText.includes('まったり')) effect = '☕️🍀🏠';
    else if (statusText.includes('仕事頑張ってる')) effect = '🔥💪😤';
    else if (statusText.includes('パソコン')) effect = '💻👀⚡️';
    else if (statusText.includes('会いたい')) effect = '🍰🍩🧋';
    else if (statusText.includes('寝るね')) effect = '🌙💤⭐️';
    else if (statusText.includes('愛してる')) effect = '❤️❤️❤️';
    else if (statusText.includes('大好き')) effect = '💖✨💘';

    window.triggerEffect(effect);
    window.saveDataToServer(statusText, effect);
};

// ==========================================================================
// 4. 自由入力のメッセージ送信
// ==========================================================================
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

// ==========================================================================
// 5. アバター変更（プリセット選択）
// ==========================================================================
window.selectPresetAvatar = function(presetId, customSrc) {
    const finalAvatarSrc = customSrc || `image/${presetId}.png`;
    
    // 自分のプレビュー画面を変更
    const myPreview = document.getElementById('my-avatar-preview');
    if (myPreview) myPreview.src = finalAvatarSrc;
    
    // 💡 相手に送信する自分のアバター写真（avatar）だけを更新！
    if (myRef) {
        update(myRef, { avatar: finalAvatarSrc })
            .then(() => console.log("選択したアバターを保存！"))
            .catch((error) => console.error("保存エラー:", error));
    }
};

// ==========================================================================
// 6. アバター変更（写真アップロード制限機能）
// ==========================================================================
function checkUploadLimit() {
    if (uploadLimit <= 0) {
        alert("今日のアバター変更枠（3回）を使い切ったよ！");
        window.closeAvatarModal();
        return false;
    }
    return true;
}

function reduceUploadCount() {
    uploadLimit--;
    const countEl = document.getElementById('upload-count');
    if (countEl) countEl.innerText = uploadLimit;
}

// ==========================================================================
// 7. 背景写真アップロード
// ==========================================================================
window.uploadBackground = function() {
    const photoInput = document.getElementById('bg-photo-input');
    const appContainer = document.getElementById('app-container');
    if (photoInput && photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (appContainer) {
                appContainer.style.backgroundImage = `url('${e.target.result}')`;
                appContainer.style.backgroundSize = 'cover';
                appContainer.style.backgroundPosition = 'center';
            }
            alert("背景画像を設定したよ！");
        };
        reader.readAsDataURL(photoInput.files[0]);
    }
};

// ==========================================================================
// 🔍 写真をタップした時に大きく拡大する魔法（高画質表示！）
// ==========================================================================
window.zoomPhoto = function(element) {
    const modal = document.getElementById('photo-zoom-modal');
    const zoomedImg = document.getElementById('zoomed-photo');
    if (modal && zoomedImg) {
        zoomedImg.src = element.src;
        // 💡 画面いっぱいに大きめで綺麗に表示する調整！
        zoomedImg.style.maxWidth = '90vw';
        zoomedImg.style.maxHeight = '80vh';
        zoomedImg.style.objectFit = 'contain';
        zoomedImg.style.borderRadius = '16px';
        
        modal.style.display = 'flex';
    }
};

window.closeZoomModal = function() {
    const modal = document.getElementById('photo-zoom-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// ==========================================================================
// 📸 タブ機能
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
// 💡 【高画質＆自分限定保存】カスタム枠・画像圧縮魔法！
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

// 💡 500pxの高画質サイズにリサイズ＆高画質化（拡大表示対応！）
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
            // 💡 0.85の高画質で圧縮保存
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            callback(compressedDataUrl);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 📸 自分の写真を読み込んでセットする魔法（相手へ丸見えをガード！）
window.uploadOwnPhoto = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        // 💡 大きめ500x500の高画質で圧縮！
        compressImage(file, 500, 500, function(compressedDataUrl) {
            if (window.isEditMode && window.currentEditingIndex !== -1) {
                const index = window.currentEditingIndex;
                const urlParams = new URLSearchParams(window.location.search);
                const roomName = urlParams.get('room') || 'default_room';
                
                // 🔒 あなたのスマホ（LocalStorage）だけに保存！相手には一切送られない！
                localStorage.setItem(`local_avatar_${roomName}_${index}`, compressedDataUrl);
                
                alert(`${index}番目の枠をあなたの端末だけに保存しました！相手には見えません。`);
                window.loadCustomAvatars(); // 自分の枠画面を書き換え
                window.toggleCustomMode();
                window.currentEditingIndex = -1;
            } else {
                // 通常のアバター選択時
                const myPreview = document.getElementById('my-avatar-preview');
                if (myPreview) myPreview.src = compressedDataUrl;
                
                // 自分のアバター（高画質）のみをFirebaseへ安全送信！
                if (typeof myRef !== "undefined" && myRef) {
                    update(myRef, { avatar: compressedDataUrl })
                        .then(() => {
                            console.log("高画質アバターの送信成功！");
                            window.closeAvatarModal();
                        })
                        .catch((err) => console.error("送信エラー:", err));
                } else {
                    window.closeAvatarModal();
                }
            }
        });
    }
};

// 💡 自分のスマホ（LocalStorage）から読み込む
window.loadCustomAvatars = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'default_room';
    
    for (let i = 1; i <= 6; i++) {
        const savedData = localStorage.getItem(`local_avatar_${roomName}_${i}`);
        if (savedData) {
            const presetImg = document.getElementById(`preset-img-${i}`);
            if (presetImg) presetImg.src = savedData;
        }
    }
};
// ==========================================================================
// ✏️ 文字カスタム＆画面自動読み込み（自分専用保存＆エフェクト連動！）
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
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'default_room';
    const myName = urlParams.get('myname') || 'user1';

    if (window.isTextEditMode) {
        const currentBtn = document.getElementById(`status-btn-${index}`);
        const currentText = currentBtn ? currentBtn.innerText : defaultText;
        const newText = prompt(`【${index + 1}番目のボタン】新しい文字を入力してね：`, currentText);
        
        if (newText !== null && newText.trim() !== "") {
            if (typeof database !== "undefined" && database) {
                // 🔒 自分専用の場所に保存して相手のボタンに影響が出ないようにガード！
                const textRef = ref(database, `rooms/${roomName}/users/${myName}/custom_texts/text_${index}`);
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
        
        // 💡 エフェクト飛ばし＆メッセージ送信を同時に実行！
        if (typeof window.changeStatus === "function") {
            window.changeStatus(selectedText);
        } else if (typeof saveDataToServer === "function") {
            saveDataToServer(selectedText, "");
        }
    }
};

window.loadCustomTexts = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'default_room';
    const myName = urlParams.get('myname') || 'user1';
    
    if (typeof database !== "undefined" && database) {
        // 🔒 自分専用の場所から読み込む！
        const customTextsRef = ref(database, `rooms/${roomName}/users/${myName}/custom_texts`);
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

// 🎬 画面起動時に自動読み込み
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (typeof window.loadCustomAvatars === "function") window.loadCustomAvatars();
        if (typeof window.loadCustomTexts === "function") window.loadCustomTexts();
    }, 1000);
});