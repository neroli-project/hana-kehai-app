// ==========================================================================
// 🚨 Firebaseの機能をインターネットから読み込む設定
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
    else if (statusText.includes('おやつ')) effect = '🍰🍩🧋';
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
// 📸 【追加コード】インスタ風画面切り替え（タブ機能）の魔法
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
// 💡 【追加】アバターの6枚枠をカスタムする魔法（LocalStorageへ保存）
// ==========================================================================
let isEditMode = false;
let currentEditingIndex = -1; // 1〜6のどの枠を編集しているか

// 1. カスタムモードのON/OFF
window.toggleCustomMode = function() {
    isEditMode = !isEditMode;
    const grid = document.getElementById('preset-avatar-grid');
    const button = document.getElementById('toggle-custom-mode');
    
    if (isEditMode) {
        grid.classList.add('edit-mode');
        button.innerText = "アバターを選ぶモードに戻る";
        button.style.backgroundColor = "#ff9800"; // 色を変えてアピール
        button.style.boxShadow = "0 3px 0 #e68a00";
    } else {
        grid.classList.remove('edit-mode');
        button.innerText = "枠の写真をカスタムする";
        button.style.backgroundColor = "#888";
        button.style.boxShadow = "0 3px 0 #666";
    }
}

// 2. アバター枠をクリックした時の処理（通常モードかカスタムモードかで切り替え）
window.handleAvatarClick = function(index, presetId) {
    if (isEditMode) {
        // カスタムモードなら、スマホのファイル選択を開く
        currentEditingIndex = index;
        document.getElementById('avatar-file-input').click(); 
    } else {
        // 通常モードなら、アバターを変更してFirebaseへ送信
        const img = document.getElementById(`preset-img-${index}`);
        window.selectPresetAvatar(presetId, img.src); // 🌟 selectPresetAvatarの引数を少し変える必要があります
    }
}

// 💡 以前作ったuploadOwnPhoto関数を、カスタム枠の上書きにも対応させる
window.uploadOwnPhoto = function(input) {
    if (!checkUploadLimit()) { alert("本日の変更回数の上限です"); return; }
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const newPhotoData = e.target.result; // 写真のデータ（Base64形式）

            if (isEditMode && currentEditingIndex !== -1) {
                // 【追加】カスタム枠の上書き処理
                // 画面上のプリセット画像を書き換える
                document.getElementById(`preset-img-${currentEditingIndex}`).src = newPhotoData;
                // ブラウザ（LocalStorage）に永続保存する
                localStorage.setItem(`customAvatar_${currentEditingIndex}`, newPhotoData);
                alert(`${currentEditingIndex}番目の枠をカスタムしました！`);
                toggleCustomMode(); // カスタムが終わったら通常モードに戻す
                currentEditingIndex = -1;
            } else {
                // 【以前の処理】自分の写真を直接アイコンにする
                document.getElementById('my-avatar-preview').src = newPhotoData;
                const currentMsg = "新しい写真を設定したよ！📸";
                window.saveDataToServer(currentMsg, "");
                reduceUploadCount();
                window.closeAvatarModal();
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ==========================================================================
// 💡 【完全版】アバターの6枚枠をカスタムする魔法（外から見えるように強化！）
// ==========================================================================
window.isEditMode = false;
window.currentEditingIndex = -1;

// 1. カスタムモードのON/OFFを切り替える魔法
window.toggleCustomMode = function() {
    window.isEditMode = !window.isEditMode;
    const grid = document.getElementById('preset-avatar-grid');
    const button = document.getElementById('toggle-custom-mode');
    
    if (window.isEditMode) {
        if(grid) grid.classList.add('edit-mode');
        if(button) {
            button.innerText = "アバターを選ぶモードに戻る";
            button.style.backgroundColor = "#ff9800"; // オレンジ色
            button.style.boxShadow = "0 3px 0 #e68a00";
        }
    } else {
        if(grid) grid.classList.remove('edit-mode');
        if(button) {
            button.innerText = "⚙️ 6つの枠の写真をカスタムする";
            button.style.backgroundColor = "#888"; // グレー
            button.style.boxShadow = "0 3px 0 #666";
        }
    }
}

// 2. 6つのアバター枠がクリックされたときの魔法（パッと閉じる魔法を追加！）
window.handleAvatarClick = function(index, presetId) {
    if (window.isEditMode) {
        // 【カスタムモード】なら、スマホのファイル選択（カメラロール）を開く
        window.currentEditingIndex = index;
        const fileInput = document.getElementById('avatar-file-input');
        if (fileInput) fileInput.click(); 
    } else {
        // 【通常モード】なら、アバターを確定してFirebaseへ送信
        const img = document.getElementById(`preset-img-${index}`);
        const customSrc = img ? img.src : null;
        window.selectPresetAvatar(presetId, customSrc);

        // ✨【ここを追加！】アバターを決定したら、ポップアップを自動でパッと閉じる！
        window.closeAvatarModal();
    }
}
// 3. 【重要】自分の写真をアップロードしたときの処理（カスタム枠の上書きにも対応！）
window.uploadOwnPhoto = function(input) {
    if (typeof checkUploadLimit === "function" && !checkUploadLimit()) {
        alert("本日の変更回数の上限です");
        return;
    }
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const newPhotoData = e.target.result;

            if (window.isEditMode && window.currentEditingIndex !== -1) {
                // 枠のカスタム処理
                const presetImg = document.getElementById(`preset-img-${window.currentEditingIndex}`);
                if (presetImg) presetImg.src = newPhotoData;
                
                // ブラウザに保存
                localStorage.setItem(`customAvatar_${window.currentEditingIndex}`, newPhotoData);
                alert(`${window.currentEditingIndex}番目の枠をカスタムしました！`);
                
                window.toggleCustomMode(); // 通常モードに戻す
                window.currentEditingIndex = -1;
            } else {
                // 自分の写真を直接アイコンにする通常処理
                const myPreview = document.getElementById('my-avatar-preview');
                if (myPreview) myPreview.src = newPhotoData;
                
                const currentMsg = "新しい写真を設定したよ！📸";
                window.saveDataToServer(currentMsg, "");
                
                if (typeof reduceUploadCount === "function") reduceUploadCount();
                window.closeAvatarModal();
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 4. アプリ起動時に過去にカスタムした画像を自動で読み込む魔法
window.loadCustomAvatars = function() {
    for (let i = 1; i <= 6; i++) {
        const savedData = localStorage.getItem(`customAvatar_${i}`);
        if (savedData) {
            const presetImg = document.getElementById(`preset-img-${i}`);
            if (presetImg) {
                presetImg.src = savedData;
            }
        }
    }
}

// 画面が完全に読み込まれたら自動で過去のカスタムを反映する
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (typeof window.loadCustomAvatars === "function") {
            window.loadCustomAvatars();
        }
    }, 500);
});