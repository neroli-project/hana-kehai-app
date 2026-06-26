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
// 👥 【大改造！】URLから自分がだれかを自動判別する仕組み
// ==========================================================================
// URLの後ろにある「?user=xxxx」を読み取る
const urlParams = new URLSearchParams(window.location.search);
let myId = urlParams.get('user');

// もしURLに何も書いてなかったら、とりあえず強制的に「user1」にする
if (!myId) {
    myId = "user1";
}

// 自分がuser1なら相手はuser2、自分がuser2なら相手はuser1にする（あべこべ構造）
const partnerId = (myId === "user1") ? "user2" : "user1";

console.log(`あなたは現在【 ${myId} 】としてログインしています。相手は【 ${partnerId} 】です。`);

// データベースのピン留め位置も、判別したユーザーに合わせて自動切り替え！
const myRef = ref(database, 'users/' + myId);
const partnerRef = ref(database, 'users/' + partnerId);

let uploadLimit = 3;

// ==========================================================================
// 🛠️ 共通で使う大事な関数
// ==========================================================================

// 自分のデータをFirebaseに送信（保存）する共通関数
function saveDataToServer(messageText, effectEmoji) {
    const currentAvatarSrc = document.getElementById('my-avatar-preview').src;
    
    // 👇【ここを追加！】手元の「いまのあなた：」の文字を書き換える
    const statusElement = document.getElementById('my-current-status');
    if (statusElement) {
        statusElement.innerText = messageText;
    }
    
    set(myRef, {
        avatar: currentAvatarSrc,
        message: messageText,
        effect: effectEmoji || "",
        checked: false // 相手がまだ見ていないので false にしておく
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
// 📡 相手のデータをリアルタイムに受信して、画面の「上半分」を書き換える
// ==========================================================================
onValue(partnerRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        if (data.avatar) {
            document.getElementById('partner-avatar').src = data.avatar;
        }
        if (data.message) {
            document.getElementById('partner-message').innerText = data.message;
        }
        if (data.effect && data.checked === false) {
            triggerEffect(data.effect);
            // 相手が送ってきたエフェクトを「既読」にする
            set(ref(database, `users/${partnerId}/checked`), true);
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

    // 自分側でも1回再生
    triggerEffect(effect);

    // 自分の最新データをサーバーに送信！
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