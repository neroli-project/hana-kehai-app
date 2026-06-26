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

// ポップアップ開閉
window.openAvatarModal = function() { document.getElementById('avatar-modal').style.display = 'flex'; }
window.closeAvatarModal = function() { document.getElementById('avatar-modal').style.display = 'none'; }

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
window.selectPresetAvatar = function(avatarName) {
    if (!checkUploadLimit()) return;
    document.getElementById('my-avatar-preview').src = `image/${avatarName}.png`;
    
    const currentMsg = "アバターを変えたよ";
    saveDataToServer(currentMsg, "");
    
    reduceUploadCount();
    closeAvatarModal();
}

// ==========================================================================
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