// ==========================================================================
// 🚨 Firebaseの機能をインターネットから読み込む設定（スッキリ修正版！）
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, child, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
const database = getDatabase(app);// ==========================================================================
// 👥 【進化版】URLから「部屋名」と「自分の名前」を読み取る仕組み
// ==========================================================================
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');   // 部屋の合言葉（例: neroli_cafe）
let myId = urlParams.get('myname');   // 自分の名前（例: neroli）

// もしURLに入力漏れがあったときのセーフティ
if (!roomId) roomId = "default_room";
if (!myId) myId = "user1";

console.log(`現在の部屋: 【 ${roomId} 】 / あなたの名前: 【 ${myId} 】`);

// データベースの保存先を『指定した部屋の中の、自分の名前の枠』にする
const myRef = ref(database, `rooms/${roomId}/users/${myId}`);
// 部屋全体のデータを監視するためのピン留め
const roomRef = ref(database, `rooms/${roomId}/users`);

let uploadLimit = 3;

// ==========================================================================
// 🛠️ 共通で使う大事な関数
// ==========================================================================

// 自分のデータをFirebaseに送信（保存）する共通関数
function saveDataToServer(messageText, effectEmoji) {
    const currentAvatarSrc = document.getElementById('my-avatar-preview').src;
    
    const statusElement = document.getElementById('my-current-status');
    if (statusElement) {
        statusElement.innerText = messageText;
    }
    
    set(myRef, {
        avatar: currentAvatarSrc,
        message: messageText,
        effect: effectEmoji || "",
        checked: false
    }).then(() => {
        console.log("Firebaseへの送信に成功！:", messageText);
    }).catch((error) => {
        console.error("Firebaseへの送信でエラー:", error);
    });
}

// エフェクトを画面に出す関数
function triggerEffect(emojis) {
    const effectLayer = document.getElementById('effect-layer');
    if (!effectLayer) return;
    
    const effectDiv = document.createElement('div');
    effectDiv.className = 'floating-effect';
    effectDiv.innerText = emojis;
    effectLayer.appendChild(effectDiv);
    setTimeout(() => { effectDiv.remove(); }, 2000);
}

// ポップアップ開閉（開く瞬間にカスタム写真を強制リロードする魔法を追加！）
window.openAvatarModal = function() { 
    // 💡 ポップアップを開く前に、過去にカスタムした写真をLocalStorageから確実に読み込む！
    if (typeof window.loadCustomAvatars === "function") {
        window.loadCustomAvatars();
    }
    
    // ポップアップを表示する
    document.getElementById('avatar-modal').style.display = 'flex'; 
}

window.closeAvatarModal = function() { 
    document.getElementById('avatar-modal').style.display = 'none'; 
}
// ==========================================================================
// 📡 【進化版】部屋にいる「自分以外の人（相手）」を自動で見つけて画面に映す
// ==========================================================================
onValue(roomRef, (snapshot) => {
    const allUsersData = snapshot.val();
    if (allUsersData) {
        // 部屋にいる全員の名前リストを取り出して、自分以外の人の名前（partnerId）を探す
        const userNames = Object.keys(allUsersData);
        const partnerId = userNames.find(name => name !== myId);
        
        // もし自分以外の相手が見つかったら、その人のデータを画面の上半分に映す！
        if (partnerId) {
            const partnerData = allUsersData[partnerId];
            
            // 相手の名前を画面に表示（〇〇のいま を書き換える）
            document.querySelector('#partner-area h2').innerText = `${partnerId} のいま`;
            
            if (partnerData.avatar) {
                document.getElementById('partner-avatar').src = partnerData.avatar;
            }
            if (partnerData.message) {
                document.getElementById('partner-message').innerText = partnerData.message;
            }
            if (partnerData.effect && partnerData.checked === false) {
                triggerEffect(partnerData.effect);
                // 相手が送ってきたエフェクトを「既読（true）」にする
                set(ref(database, `rooms/${roomId}/users/${partnerId}/checked`), true);
            }
        }
    }
});

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

    triggerEffect(effect);
    saveDataToServer(statusText, effect);
}
// ==========================================================================
// 4. 自由入力のメッセージ送信
// ==========================================================================
window.sendStatus = function() {
    const messageInput = document.getElementById('my-message-text');
    if (messageInput.value.trim() === "") {
        alert("メッセージを入力してね！");
        return;
    }
    document.getElementById('my-current-status').innerText = messageInput.value;
    triggerEffect('✨🎉✨');
    saveDataToServer(messageInput.value, '✨🎉✨');
    messageInput.value = "";
}

// ==========================================================================
// 5. アバター変更（プリセット）
// ==========================================================================
// ✨ アバターを選んだときの処理（エラー修正版！）
window.selectPresetAvatar = function(presetId, customSrc) {
    // もしカスタムされた画像URL（Base64など）があればそれを使い、なければ元の画像パスを使う
    const finalAvatarSrc = customSrc || `image/${presetId}.png`;
    
    // 自分のプレビュー画像を書き換える
    const myPreview = document.getElementById('my-avatar-preview');
    if (myPreview) {
        myPreview.src = finalAvatarSrc;
    }
    
    // サーバー（Firebase）に保存する
    const currentMsg = "アバターを変えたよ";
    
    // 💡 ここがポイント！元の「saveDataToServer」の形に合わせて、window. を外して呼び出すよ
    if (typeof saveDataToServer === "function") {
        saveDataToServer(currentMsg, "");
    } else if (typeof window.saveDataToServer === "function") {
        window.saveDataToServer(currentMsg, "");
    }
}// ==========================================================================
// 6. アバター変更（写真アップロード）
// ==========================================================================
window.uploadMyAvatarPhoto = function() {
    if (!checkUploadLimit()) return;
    const fileInput = document.getElementById('avatar-file-input');
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('my-avatar-preview').src = e.target.result;
            saveDataToServer("新しい写真アバターにしたよ！", "📸");
            reduceUploadCount();
            closeAvatarModal();
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

function checkUploadLimit() {
    if (uploadLimit <= 0) {
        alert("今日のアバター変更枠（3回）を使い切ったよ！");
        closeAvatarModal();
        return false;
    }
    return true;
}

function reduceUploadCount() {
    uploadLimit--;
    document.getElementById('upload-count').innerText = uploadLimit;
}

// ==========================================================================
// 7. 背景写真アップロード
// ==========================================================================
window.uploadBackground = function() {
    const photoInput = document.getElementById('bg-photo-input');
    const appContainer = document.getElementById('app-container');
    if (photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            appContainer.style.backgroundImage = `url('${e.target.result}')`;
            appContainer.style.backgroundSize = 'cover';
            appContainer.style.backgroundPosition = 'center';
            alert("背景画像を設定したよ！");
        };
        reader.readAsDataURL(photoInput.files[0]);
    }
}

// ==========================================================================
// 📡 【新機能】ページを開いた時に、自分の最新データをFirebaseから読み込んで復活させる
// ==========================================================================
onValue(myRef, (snapshot) => {
    const myData = snapshot.val();
    if (myData) {
        // 1. 保存されていたメッセージを復活
        if (myData.message) {
            const statusElement = document.getElementById('my-current-status');
            if (statusElement) {
                statusElement.innerText = myData.message;
            }
        }
        // 2. 保存されていたアバター画像を復活
        if (myData.avatar) {
            const avatarElement = document.getElementById('my-avatar-preview');
            if (avatarElement) {
                avatarElement.src = myData.avatar;
            }
        }
    }
});

// ==========================================================================
// 🔍 【追加コード】写真をタップした時に大きく拡大する魔法
// ==========================================================================
window.zoomPhoto = function(element) {
    const modal = document.getElementById('photo-zoom-modal');
    const zoomedImg = document.getElementById('zoomed-photo');
    if (modal && zoomedImg) {
        zoomedImg.src = element.src;
        modal.style.display = 'flex';
    }
}

window.closeZoomModal = function() {
    const modal = document.getElementById('photo-zoom-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ==========================================================================
// 📸 インスタ風画面切り替え（タブ機能）の魔法
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
}

// アプリを開いた瞬間に、自動で「あいて」のタブを最初に選んでおく魔法
window.addEventListener('DOMContentLoaded', () => {
    if (typeof window.switchTab === 'function') {
        window.switchTab('partner');
    }
});

// ==========================================================================
// 📸 【復活！】自分の写真を読み込んでセットする魔法
// ==========================================================================
window.uploadOwnPhoto = function(input) {
    if (!checkUploadLimit()) {
        alert("本日の変更回数の上限です");
        return;
    }

    // 写真がちゃんと選ばれているかチェック
    if (input.files && input.files[0]) {
        const reader = new FileReader();

        // 写真の読み込みが完了した時の処理
        reader.onload = function(e) {
            // 自分のアバタープレビューを、選んだ写真に書き換える
            document.getElementById('my-avatar-preview').src = e.target.result;

            // Firebaseのサーバーにも、この写真のデータを送信する
            const currentMsg = "新しい写真を設定したよ！📸";
            window.saveDataToServer(currentMsg, "");

            // 制限回数を減らしてモーダルを閉じる
            reduceUploadCount();
            window.closeAvatarModal();
        };

        // 写真をデータとして読み込む
        reader.readAsDataURL(input.files[0]);
    }
}

// ==========================================================================
// 💡 【ログインなし版・完全個室】アバター＆文字カスタムLocalStorage版魔法！
// ==========================================================================

// --- ⚙️ アバター用の設定群 ---
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
        if (typeof checkUploadLimit === "function" && !checkUploadLimit()) {
            alert("本日の変更回数の上限（3回）に達したため、変更できません。");
            return;
        }
        const img = document.getElementById(`preset-img-${index}`);
        const customSrc = img ? img.src : null;
        window.selectPresetAvatar(presetId, customSrc);
        if (typeof reduceUploadCount === "function") reduceUploadCount();
        if (typeof window.closeAvatarModal === "function") window.closeAvatarModal();
    }
};

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
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(compressedDataUrl);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 💡 修正ポイント：Firebaseではなく、このスマホ（LocalStorage）だけにこっそり保存！
window.uploadOwnPhoto = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        compressImage(file, 150, 150, function(compressedDataUrl) {
            if (window.isEditMode && window.currentEditingIndex !== -1) {
                const index = window.currentEditingIndex;
                const urlParams = new URLSearchParams(window.location.search);
                const roomName = urlParams.get('room') || 'default_room';
                
                // このスマホ専用の秘密の鍵名を作る
                localStorage.setItem(`local_avatar_${roomName}_${index}`, compressedDataUrl);
                
                alert(`${index}番目の枠をあなたのスマホだけに保存しました！相手には見えません。`);
                window.loadCustomAvatars(); // 画面をすぐ書き換え
                window.toggleCustomMode();
                window.currentEditingIndex = -1;
            } else {
                if (typeof checkUploadLimit === "function" && !checkUploadLimit()) { alert("本日の変更回数の上限です"); return; }
                const myPreview = document.getElementById('my-avatar-preview');
                if (myPreview) myPreview.src = compressedDataUrl;
                if (typeof saveDataToServer === "function") { saveDataToServer("新しい写真を設定したよ！📸", ""); }
                if (typeof reduceUploadCount === "function") reduceUploadCount();
                window.closeAvatarModal();
            }
        });
    }
};

// 💡 修正ポイント：自分のスマホに保存した画像を読み込んで枠をハックするよ！
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


// --- ⚙️ 文字カスタム用の設定群（文字もこの部屋の全員で共有するならFirebaseのままでOK！） ---
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

    if (window.isTextEditMode) {
        const currentBtn = document.getElementById(`status-btn-${index}`);
        const currentText = currentBtn ? currentBtn.innerText : defaultText;
        const newText = prompt(`【${index + 1}番目のボタン】新しい文字を入力してね：`, currentText);
        
        if (newText !== null && newText.trim() !== "") {
            if (typeof database !== "undefined" && database) {
                const textRef = ref(database, `rooms/${roomName}/custom_texts/text_${index}`);
                set(textRef, newText).then(() => {
                    alert(`ボタンの文字を「${newText}」に保存しました！`);
                    window.toggleTextCustomMode();
                }).catch((error) => { console.error("文字保存エラー:", error); });
            }
        }
    } else {
        const currentBtn = document.getElementById(`status-btn-${index}`);
        const selectedText = currentBtn ? currentBtn.innerText : defaultText;
        if (typeof saveDataToServer === "function") {
            saveDataToServer(selectedText, "");
        }
    }
};

window.loadCustomTexts = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'default_room';
    
    if (typeof database !== "undefined" && database) {
        const customTextsRef = ref(database, `rooms/${roomName}/custom_texts`);
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