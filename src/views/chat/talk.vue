<template>
    <div>
        <div class="chat-messages" id="chatMessages" ref="chatMessages">
            <div v-for="item in state.historyContentList[state.rkey]" :class="getClass(item)">
                <van-image width="50" height="50" round :src="item.Avatar" />
                <div class="message-content">
                    <p v-if="item.MsgMedia == 1">{{ getContent(item) }}</p>
                    <p v-if="item.MsgMedia == 2">
                        <van-image width="100" height="100" :src="getContent(item)"
                            @click="previewPic(getContent(item))" />
                    </p>
                    <p v-if="item.MsgMedia == 3">
                        <audio controls>
                            <source :src="getContent(item)" type="audio/mpeg">
                            <source :src="getContent(item)" type="audio/ogg">
                            <embed height="50" width="100" :src="getContent(item)">
                            Your browser does not support the audio element.
                        </audio>
                    </p>
                    <p v-if="item.MsgMedia == 4">
                        <video width="100%" height="100%" controls>
                            <source :src="getContent(item)" type="video/mp4">
                            <source :src="getContent(item)" type="video/ogg">
                            Your browser does not support the video element.
                        </video>
                    </p>
                    <p v-if="item.MsgMedia == 5">
                        <van-icon name="description-o" />
                        <a :href="item.Content.Url" download>{{ item.Content.Name }}</a>
                    </p>
                    <p v-if="item.MsgMedia == 6">
                        <van-image width="40" height="40" round :src="getContent(item)"
                            @click="previewPic(getContent(item))" />
                    </p>
                    <p v-if="item.MsgMedia == 7">
                        <van-icon name="phone-o"/>{{ getContent(item) }}
                    </p>
                    <span class="message-time">{{ formatTime(item.CreateTime, "hh:mm") }}</span>
                    <div class="status-icon read"></div>
                </div>
            </div>
        </div>
        <div class="el-footer">
            <div class="input-container-inner">
                <van-field v-model="state.input" label="" @input="changeInput" />
                <span :size="30" @click="showSmile" ref="showSmileRef"><van-icon name="smile-o" :size="30" /></span>
                <span :size="30" @click="showPlugin" v-show="state.isInputEmpty" ref="showPluginRef"><van-icon
                        name="add-o" :size="30" /></span>
                <van-icon name="guide-o" :size="30" @click="sendTextMessage" v-if="!state.isInputEmpty" />
            </div>
            <div class="chat-smile" v-if="state.isShowSmile" ref="smileRef">
                <van-image v-for="item in state.emojs" width="30" height="30" :src="item"
                    @click="sendEmojsMessage(item)" />
            </div>
            <div class="chat-plugins" v-if="state.isShowPlugin" ref="pluginRef">
                <div class="plugins-item">
                    <van-uploader accept="image/*" :after-read="handleSuccessImage">
                        <van-icon name="photo-o" class="icon" />
                        相册
                    </van-uploader>
                </div>
                <div class="plugins-item">
                    <van-uploader accept=".pdf,.doc,.docx,.zip,.rar,.7z,.csv" :after-read="handleSuccessFile">
                        <van-icon name="description-o" class="icon" />
                        文件
                    </van-uploader>
                </div>
                <div class="plugins-item">
                    <van-uploader accept="audio/*" :after-read="handleSuccessAudio">
                        <van-icon name="service-o" class="icon" />
                        音频
                    </van-uploader>
                </div>
                <div class="plugins-item">
                    <van-uploader accept="video/*" :after-read="handleSuccessVideo">
                        <van-icon name="video-o" class="icon" />
                        视频
                    </van-uploader>
                </div>
                <div class="plugins-item">
                    <van-icon name="phone-o" class="icon" @click="goPhone" />
                    <div>电话</div>
                </div>
            </div>
        </div>
        <van-overlay :show="state.isShowPhone">
            <div class="wrapper" v-show="state.showType == 1">
                <van-image class="wrapper-img" :src="props.talkData.icon" width="200" height="200" round />
                <div class="wrapper-text">{{ props.talkData.name }}({{ props.talkData.toId }})</div>
                <div class="wrapper-tips">正在呼叫…</div>
                <van-button type="danger" size="small" block @click="quitPhone">挂断</van-button>
            </div>
            <div class="wrapper" v-show="state.showType == 2">
                <van-image class="wrapper-img" :src="props.talkData.icon" width="200" height="200" round />
                <div class="wrapper-text">{{ props.talkData.name }}({{ props.talkData.toId }})</div>
                <div class="wrapper-tips">正在呼叫…</div>
                <van-button type="danger" size="small" block @click="doPhone">接通</van-button>
            </div>
            <div class="wrapper" v-show="state.showType == 3">
                <video ref="remoteVideo" autoplay class="remote-video"></video>
                <video ref="localVideo" autoplay class="local-video"></video>
                <van-button type="danger" size="small" block @click="quitPhone" class="phoneing-quit">挂断</van-button>
            </div>
        </van-overlay>
    </div>

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { showImagePreview } from 'vant';
import { formatTime } from '@/utils/formatTime';
import type { UserInfo, MsgData } from '@/utils/schema';
import { Session } from '@/utils/storage';
import { inArray } from '@/utils/common';
import { upload } from '@/api/index';
import { addItem, deleteByMultipleIndexes, getByTimeIndex, getItemById } from '@/utils/indexedDB';

const props = defineProps(['db', 'socket', 'talkData'])
const emit = defineEmits(['update-parameter'])

const chatMessages = ref<HTMLElement | null>(null);
const pluginRef = ref<HTMLElement | null>(null);
const showPluginRef = ref<HTMLElement | null>(null);

const smileRef = ref<HTMLElement | null>(null);
const showSmileRef = ref<HTMLElement | null>(null);

const localVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const peerConnection = ref<RTCPeerConnection | null>(null);

const state = reactive({
    url: "/api/attach/upload",
    selftUserInfo: {} as UserInfo,
    isShowSmile: false,
    isShowPlugin: false,
    input: "",
    isInputEmpty: true,
    historyContentList: {} as { [key: string]: MsgData[] },
    rkey: "",
    emojs: [] as string[],
    isShowPhone: false,
    showType: 0,  // 1显示呼叫对方 2、显示对方呼叫自己 3、通话中
});

onMounted(() => {
    console.log(props.talkData)
    // 在页面加载完成后，添加点击事件监听器
    document.addEventListener('click', handleOutsideClick);
    init()
});

onUnmounted(() => {
    document.removeEventListener('click', handleOutsideClick);
});

watch(props, () => {
    console.log("watch", props.talkData)
    init()
})

const handleOutsideClick = (event: any) => {
    if (pluginRef.value && showPluginRef.value) {
        if (!pluginRef.value.contains(event.target) && !showPluginRef.value.contains(event.target)) {
            state.isShowPlugin = false;
        }
    }
    if (smileRef.value && showSmileRef.value) {
        if (!smileRef.value.contains(event.target) && !showSmileRef.value.contains(event.target)) {
            state.isShowSmile = false;
        }
    }
}


const init = async() => {
    state.selftUserInfo = Session.get('userInfo')

    state.emojs = []
    for (let i = 0; i <= 134; i++) {
        const num = String(i).padStart(2, '0');
        state.emojs.push(`/src/assets/images/emojs/${num}.gif`)
    }
    if (props.talkData.msgType && props.talkData.toId) {
        state.rkey = getKey(props.talkData.msgType, state.selftUserInfo.Uid, props.talkData.toId)
        setChatList()
    }
};

const changeInput = () => {
    if (state.input == "") {
        state.isInputEmpty = true;
    } else {
        state.isInputEmpty = false;
        state.isShowPlugin = false;
    }
}

const previewPic = (pic: string) => {
    showImagePreview([pic]);
}

const showPlugin = () => {
    state.isShowPlugin = !state.isShowPlugin;
}

const showSmile = () => {
    state.isShowSmile = !state.isShowSmile;
}

const getKey = (msgType: number, fromId: number, toId: number) => {
    let rkey = ""
    if (msgType == 1) {
        rkey = fromId < toId ? `${msgType}_${fromId}_${toId}` : `${msgType}_${toId}_${fromId}`
    } else if (msgType == 2) {
        rkey = `${msgType}_${toId}`
    }
    return rkey
}

const getClass = (item: MsgData) => {
    const classstr =  item.FromId === state.selftUserInfo.Uid ? 'message user-message' : 'message other-message'
    if (item.MsgType == 1 && item.MsgMedia == 7) {
        return "message user-message"
    }
    return classstr
}

const setChatList = async () => {
    if (Object.keys(state.historyContentList).length === 0) {
        let nowtime = Math.floor(Date.now() / 1000)
        const temps = await getByTimeIndex(props.db, "message", "CreateTime", nowtime - 24 * 3600 * 30, nowtime)
        console.log("setChatList",temps)
        for (let temp of temps) {
            const msgData = temp as unknown as MsgData
            const rkey = getKey(msgData.MsgType, msgData.FromId, msgData.ToId)
            if (!state.historyContentList.hasOwnProperty(rkey)) {
                state.historyContentList[rkey] = []
            }
            state.historyContentList[rkey].push(msgData) 
        }
    }
    console.log("setChatList",state.historyContentList)
    
    setTimeout(setScroll, 1); // 1毫秒后滚动
}


const getContent = (item: MsgData) => {

    if (inArray(item.MsgMedia, [1, 7])) {
        return item.Content.Data
    } else {
        return item.Content.Url
    }
}

const sendEmojsMessage = (item: string) => {
    const content = { "Url": item }
    sendMessage({ Content: content, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 6, MsgType: props.talkData.msgType });
    state.isShowSmile = !state.isShowSmile;
}

const sendTextMessage = () => {
    const content = { "Data": state.input }
    sendMessage({ Content: content, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 1, MsgType: props.talkData.msgType });
    state.input = ""
    changeInput()
}


const handleSuccessImage = (file: any) => {
    const formData = new FormData()
    formData.append('file', file.file)
    upload(formData).then((response: any) => {
        const content = { "Url": response.data, "Name": file.file.name }
        sendMessage({ Content: content, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 2, MsgType: props.talkData.msgType });
        state.isShowPlugin = false
    });
}

const handleSuccessFile = (file: any) => {
    const formData = new FormData()
    formData.append('file', file.file)
    upload(formData).then((response: any) => {
        const content = { "Url": response.data, "Name": file.file.name }
        sendMessage({ Content: content, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 5, MsgType: props.talkData.msgType });
        state.isShowPlugin = false
    });
}

const handleSuccessAudio = (file: any) => {
    const formData = new FormData()
    formData.append('file', file.file)
    upload(formData).then((response: any) => {
        const content = { "Url": response.data, "Name": file.file.name }
        sendMessage({ Content: content, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 3, MsgType: props.talkData.msgType });
        state.isShowPlugin = false
    });
}
const handleSuccessVideo = (file: any) => {
    const formData = new FormData()
    formData.append('file', file.file)
    upload(formData).then((response: any) => {
        const content = { "Url": response.data, "Name": file.file.name }
        sendMessage({ Content: content, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 4, MsgType: props.talkData.msgType });
        state.isShowPlugin = false
    });
}


const sendMessage = async (data: any) => {
    const jsonString = JSON.stringify(data);
    if (!props.socket || props.socket.readyState !== WebSocket.OPEN) {
        emit("update-parameter")
        return
    }
    if (data.MsgType == 4) {
        console.log("sendMessage", JSON.parse(jsonString))
    }

    props.socket.send(jsonString);
    if (!inArray(data.MsgType, [1, 2])) {
        return
    }


    data.Avatar = state.selftUserInfo.Avatar
    data.CreateTime = Math.floor(Date.now() / 1000)

    const rkey = getKey(props.talkData.msgType, state.selftUserInfo.Uid, props.talkData.toId)
    if (!state.historyContentList.hasOwnProperty(rkey)) {
        state.historyContentList[rkey] = []
    }
    state.historyContentList[rkey].push(data)

    await addItem(props.db, "message", data);
    setTimeout(setScroll, 1);  // 1毫秒后滚动
}
1

const onMessage = async (event: any) => {
    const data = JSON.parse(event.data);
    console.log("onMessage", event.data)

    const userInfo = await getItemById(props.db, "users", data.FromId)
    data.Avatar = userInfo.Avatar

    const rkey = getKey(data.MsgType, data.FromId, data.ToId)
    if (!state.historyContentList.hasOwnProperty(rkey)) {
        state.historyContentList[rkey] = []
    }
    state.historyContentList[rkey].push(data)

    await addItem(props.db, "message", data);
    setTimeout(setScroll, 1);  // 1毫秒后滚动
}

const clearMessage = (msgType: number, fromId: number, toId: number) => {
    if (!props.db) {
        return
    }
    const rkey = getKey(msgType, fromId, toId)
    state.historyContentList[rkey] = []
    if (msgType == 1) {
        deleteByMultipleIndexes(props.db, 'message', [{ indexName: "MsgType", value: msgType }, { indexName: "FromId", value: fromId }, { indexName: "ToId", value: toId }])
        deleteByMultipleIndexes(props.db, 'message', [{ indexName: "MsgType", value: msgType }, { indexName: "FromId", value: fromId }, { indexName: "ToId", value: toId }])
    }
    if (msgType == 2) {
        deleteByMultipleIndexes(props.db, 'message', [{ indexName: "MsgType", value: msgType }, { indexName: "ToId", value: toId }])
    }
}



const setScroll = () => {
    nextTick();
    if (chatMessages.value) {
        chatMessages.value.scrollTop = chatMessages.value.scrollHeight + 80;
        console.log(chatMessages.value.scrollHeight, chatMessages.value.scrollHeight + 80, chatMessages.value.scrollTop)
    }
}


// ----------------------------------------------------------------语音通话 ----------------------------------------------------------------

const loadTalkManage = async (data: any) => {
    console.log("loadTalkManage")
    if (data.MsgMedia == 0) {   //收到语音通话 - 请求
        state.isShowPhone = true;
        state.showType = 2;
    }
    if (data.MsgMedia == 1) {   //收到语音通话 - 挂断
        state.isShowPhone = false;
        state.showType = 0;
        leave()
    }
    if (data.MsgMedia == 2) {   //收到语音通话 - 通话
        state.showType = 3;
        await startConection()
        await startVideoCall()
    }
    if (data.MsgMedia == 3) {   //收到语音通话 - 候选人
        handleIceCandidate(data.Content.Data)
    }
    if (data.MsgMedia == 4) {   //收到语音通话 - OFFER
        handleOffer(data.Content.Data)
    }
    if (data.MsgMedia == 5) {   //收到语音通话 - ANSWER
        handleAnswer(data.Content.Data)
    }
}

//1、拨打语音通话
const goPhone = async() => {
    state.isShowPhone = true;
    state.showType = 1;
    sendMessage({ Content: { Data: "" }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 0, MsgType: 4 });
}
//2、挂断语音通话
const quitPhone = async () => {
    state.isShowPhone = false;
    state.showType = 0;
    leave()
    sendMessage({ Content: { Data: "" }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 1, MsgType: 4 });
}


//3、接通语音通话
const doPhone = async () => {
    state.showType = 3;
    await startConection()
    await startVideoCall()
    // 发送offer给接收方  
    sendMessage({ Content: { Data: "" }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 2, MsgType: 4 });
}



const leave = () => {
    peerConnection.value?.close()
    peerConnection.value = null
    stopLocalStream()
}

// 停止本地流的所有轨道
const stopLocalStream = async() => {
    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
        });
    }
}


const startVideoCall = async () => {
    if (!localVideo.value) {
        return
    }
    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    localStream.getTracks().forEach(track => {
        if (peerConnection.value) {
            console.log("getTracks" , state.selftUserInfo.Uid)
            peerConnection.value.addTrack(track, localStream);
        }
    })

    localVideo.value.srcObject = localStream;

    if (!peerConnection.value) {
        return
    }
    const offerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
    }
    const offer = await peerConnection.value.createOffer(offerOptions);
    await peerConnection.value.setLocalDescription(offer);

    sendMessage({ Content: { Data: JSON.stringify(offer) }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 4, MsgType: 4 });

}

const startConection = async () => {

    console.log("startConection",localVideo.value,remoteVideo.value)

    const pcConfig:RTCConfiguration = {  // webrtc建立点对点的对等连接需要用到iceServers，否则只能在内网局域网使用,https://gist.github.com/yetithefoot/7592580
        'iceServers': 
        [
            {urls:'stun:stun01.sipphone.com'},
            {urls:'stun:stun.ekiga.net'},
            {urls:'stun:stun.fwdnet.net'},
            {urls:'stun:stun.ideasip.com'},
            {urls:'stun:stun.iptel.org'},
            {urls:'stun:stun.rixtelecom.se'},
            {urls:'stun:stun.schlund.de'},
            {urls:'stun:stun.l.google.com:19302'},
            {urls:'stun:stun1.l.google.com:19302'},
            {urls:'stun:stun2.l.google.com:19302'},
            {urls:'stun:stun3.l.google.com:19302'},
            {urls:'stun:stun4.l.google.com:19302'},
            {urls:'stun:stunserver.org'},
            {urls:'stun:stun.softjoys.com'},
            {urls:'stun:stun.voiparound.com'},
            {urls:'stun:stun.voipbuster.com'},
            {urls:'stun:stun.voipstunt.com'},
            {urls:'stun:stun.voxgratia.org'},
            {urls:'stun:stun.xten.com'},
            {
                urls: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            },
            {
                urls: 'turn:192.158.29.39:3478?transport=udp',
                credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                username: '28224511:1379330808'
            },
            {
                urls: 'turn:192.158.29.39:3478?transport=tcp',
                credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                username: '28224511:1379330808'
            }
        ],
    }

    if (!peerConnection.value){
        peerConnection.value = new RTCPeerConnection(pcConfig);

        // 当收到候选者时，将其添加到对等连接中
        peerConnection.value.onicecandidate = (event) => {
            console.log("onicecandidate")
            if (event.candidate) {
                // 发送ICE候选给接收方  
                sendMessage({ Content: { Data: JSON.stringify(event.candidate) }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 3, MsgType: 4 });
            }
        };

        // 当远程流添加到对等连接时，将其添加到视频元素中播放
        peerConnection.value.ontrack = function (event) {
            console.log("ontrack");
            if (remoteVideo.value) {
                // 将远程流设置给远程视频元素
                remoteVideo.value.srcObject = event.streams[0];
            }
        };

    }

}



// 处理收到的Offer
const handleOffer = async (offerstr: any) => {
    console.log("handleOffer",peerConnection.value);
    if (peerConnection.value) {
        const offer = JSON.parse(offerstr);
        await peerConnection.value.setRemoteDescription(new RTCSessionDescription(offer));
        sendAnswer();
    }

};

// 处理收到的ICE候选
const handleIceCandidate = (candidatestr: any) => {
    console.log("handleIceCandidate");
    if (peerConnection.value) {
        const candidate = JSON.parse(candidatestr);
        peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate));
    }
};

// 处理收到的ICE候选
const handleAnswer = async (answerstr: any) => {
    console.log("handleAnswer");
    if (peerConnection.value) {
        const answer = JSON.parse(answerstr);
        await peerConnection.value.setRemoteDescription(new RTCSessionDescription(answer));
    }
};

// 处理收到的ICE候选
const sendAnswer = async () => {
    console.log("sendAnswerToOfferer")
    if (peerConnection.value) {
        let answer = await peerConnection.value.createAnswer()
        await peerConnection.value.setLocalDescription(answer);
        sendMessage({ Content: { Data: JSON.stringify(answer) }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 5, MsgType: 4 });
    }
};



// 暴露变量
defineExpose({
    onMessage,
    sendMessage,
    clearMessage,
    loadTalkManage,
});

</script>
<style scoped>
.el-footer {
    padding: 0;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 45px;
    border-top: 1px solid #ccc;
    background-color: #fff;
}

.chat-messages {
    margin-top: 46px;
    height: calc(100vh - 80px);
    overflow-y: auto;
    padding: 10px;
    background-color: #fff;
}

.message {
    display: flex;
    align-items: flex-end;
    margin-bottom: 10px;
    max-width: 99%;
}

.user-message {
    flex-direction: row-reverse;
}

.message .el-avatar {
    margin-bottom: 20px;
}

.message .message-content {
    max-width: 80%;
    padding: 10px;
    border-radius: 10px;
    background-color: #e1ffc7;
}

.other-message .message-content {
    background-color: #fff;
    padding-bottom: 0;
}

.input-container-inner {
    width: 100%;
    display: flex;
    bottom: 0;
    padding: 5px;
    border-top: 1px solid #ccc;
}

.input-container-inner .van-cell {
    padding: 0;
}

.chat-plugins {
    position: absolute;
    bottom: 44px;
    background-color: #fff;
    width: 100%;
    text-align: left;
    border-top: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
}

.plugins-item {
    width: 25%;
    padding: 10px 0;
    text-align: center;
    display: inline-block;
}

.icon {
    font-size: 55px;
    height: 55px;
    width: 80%;
}

.chat-smile {
    position: absolute;
    bottom: 44px;
    background-color: #fff;
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    border-top: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    padding: 10px 0 0 10px;
}

.chat-smile .van-image {
    padding: 3px;
}


/*-----------------*/
.wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 100%;
    padding: 0 20px;
}

.wrapper-text {
    margin: 10px 0 20px 0;
    display: block;
    color: white;
}

.wrapper-tips {
    margin: 20px 0 100px 0;
    display: block;
    color: white;
    font-size: 80%;
}

.remote-video {
    height: 100%;
}

.local-video {
    width: 30%;
    height: auto;
    position: absolute;
    right: 0;
    top: 0;
}

.phoneing-quit {
    margin-bottom: 10%;
}
</style>