<template>
    <div class="phone">
        <van-overlay :show="state.showType >0" >
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
                <div class="rev-tips">
                    <van-button type="danger" size="small" @click="quitPhone">挂断</van-button>
                    <van-button type="success" size="small" @click="doPhone">接通</van-button>
                </div>
            </div>
            <div class="wrapper" v-show="state.showType == 3">
                <video ref="remoteVideo" autoplay class="remote-video"></video>
                <video ref="localVideo" autoplay class="local-video"></video>
                <div class="times" v-if="state.times > 0">通话时长：{{ formatSeconds(state.times) }}</div><van-button type="danger" size="small" block @click="quitPhoneDone" class="phoneing-quit">挂断</van-button>
            </div>
        </van-overlay>
    </div>

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { UserInfo, MsgData } from '@/utils/schema';
import { Session } from '@/utils/storage';
import { formatSeconds } from '@/utils/formatTime';


const props = defineProps(['db', 'socket', 'talkData', 'phoneData'])
const emit = defineEmits(['update-parameter','update-parameter-phone-send','update-parameter-phone-request','update-parameter-phone-response'])

const phoneTimer = ref<NodeJS.Timeout | number>(0);

const localVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const peerConnection = ref<RTCPeerConnection | null>(null);

const state = reactive({
    selftUserInfo: {} as UserInfo,
    showType: 0,  // 1显示呼叫对方 2、显示对方呼叫自己 3、通话中
    times:0,
    sendUid:0,
});

onMounted(() => {
    console.log(props.talkData)
    console.log(props.phoneData)
    // 在页面加载完成后，添加点击事件监听器
    init()
});

onUnmounted(() => {
    clearInterval(phoneTimer.value)
});

watch(props, () => {
    console.log("watch", props.talkData)
    init()
})


const init = ()=>{
    state.selftUserInfo = Session.get('userInfo')
}

// ----------------------------------------------------------------语音通话 ----------------------------------------------------------------

const loadPhoneManage = async (data: any) => {
    console.log("loadPhoneManage")
    if (data.MsgMedia == 0) {   //收到语音通话 - 请求
        emit("update-parameter-phone-request" , data.FromId)
        state.sendUid = data.FromId
        state.showType = 2;
    }
    if (data.MsgMedia == 1) {   //收到语音通话 - 挂断
        state.showType = 0;
        leave()
    }
    if (data.MsgMedia == 2) {   //收到语音通话 - 通话
        state.showType = 3;
        await startConection()
        await startVideoCall()
        state.times = 0
        phoneTimer.value = setInterval(() => { state.times++ }, 1000);
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
const goPhone = async () => {
    state.showType = 1;
    state.sendUid = state.selftUserInfo.Uid
    emit("update-parameter-phone-send" , { Content: { Data: "" }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 0, MsgType: 4 })
}
//2-1、挂断语音通话(未接通)
const quitPhone = async () => {
    state.showType = 0;
    leave()
    emit("update-parameter-phone-send" , { Content: { Data: "" }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 1, MsgType: 4 });

    const content = { "Data": "挂断电话" }
    emit("update-parameter-phone-send" , { Content: content, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 13, MsgType: 1 });

}

//2-2、挂断语音通话(接通)
const quitPhoneDone = async () => {
    state.showType = 0;
    emit("update-parameter-phone-send" , { Content: { Data: "" }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 1, MsgType: 4 });
    emit("update-parameter-phone-send" , { Content: { Data: `${state.times}` }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId , MsgMedia: 12, MsgType: 1 });
    leave()
    clearInterval(phoneTimer.value)
}

//3、接通语音通话
const doPhone = async () => {
    emit("update-parameter-phone-response")
    state.showType = 3;
    await startConection()
    await startVideoCall()
    // 发送offer给接收方  
    emit("update-parameter-phone-send" , { Content: { Data: "" }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 2, MsgType: 4 });
    state.times = 0
    phoneTimer.value = setInterval(() => { state.times++ }, 1000);
}



const leave = () => {
    peerConnection.value?.close()
    peerConnection.value = null
    stopLocalStream()
    stopRemoteStream()
}

// 停止本地流的所有轨道
const stopLocalStream = async () => {
    if (!localVideo.value) {
        return
    }
    const localStream = localVideo.value.srcObject as MediaStream;
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
        });
    }
    localVideo.value.srcObject = null
}

// 停止本地流的所有轨道
const stopRemoteStream = async () => {
    if (!remoteVideo.value) {
        return
    }
    const remoteStream = remoteVideo.value.srcObject as MediaStream;
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => {
            track.stop();
        });
    }
    remoteVideo.value.srcObject = null
}


const startVideoCall = async () => {
    if (!localVideo.value) {
        return
    }
    const constraints:MediaStreamConstraints = { 
        video: {
            width: 1920 , // 设置理想的视频宽度
            height: 1080 , // 设置理想的视频高度
            frameRate: 60  // 设置理想的帧率
        }, 
        audio: { 
            echoCancellation: true, // 启用回声消除
        } 
    }
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);

    localStream.getTracks().forEach(track => {
        if (peerConnection.value) {
            console.log("getTracks", state.selftUserInfo.Uid)
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

    emit("update-parameter-phone-send" , { Content: { Data: JSON.stringify(offer) }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 4, MsgType: 4 });

}

const startConection = async () => {

    console.log("startConection", localVideo.value, remoteVideo.value)

    const pcConfig: RTCConfiguration = {  // webrtc建立点对点的对等连接需要用到iceServers，否则只能在内网局域网使用,https://gist.github.com/yetithefoot/7592580
        'iceServers':
            [
                { urls: 'stun:stun01.sipphone.com' },
                { urls: 'stun:stun.ekiga.net' },
                { urls: 'stun:stun.fwdnet.net' },
                { urls: 'stun:stun.ideasip.com' },
                { urls: 'stun:stun.iptel.org' },
                { urls: 'stun:stun.rixtelecom.se' },
                { urls: 'stun:stun.schlund.de' },
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:stunserver.org' },
                { urls: 'stun:stun.softjoys.com' },
                { urls: 'stun:stun.voiparound.com' },
                { urls: 'stun:stun.voipbuster.com' },
                { urls: 'stun:stun.voipstunt.com' },
                { urls: 'stun:stun.voxgratia.org' },
                { urls: 'stun:stun.xten.com' },
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

    if (!peerConnection.value) {
        peerConnection.value = new RTCPeerConnection(pcConfig);

        // 当收到候选者时，将其添加到对等连接中
        peerConnection.value.onicecandidate = (event) => {
            console.log("onicecandidate")
            if (event.candidate) {
                // 发送ICE候选给接收方  
                emit("update-parameter-phone-send" , { Content: { Data: JSON.stringify(event.candidate) }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 3, MsgType: 4 });
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
    console.log("handleOffer", peerConnection.value);
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
        emit("update-parameter-phone-send" , { Content: { Data: JSON.stringify(answer) }, FromId: state.selftUserInfo.Uid, ToId: props.talkData.toId, MsgMedia: 5, MsgType: 4 });
    }
};



// 暴露变量
defineExpose({
    loadPhoneManage,
    goPhone,
});

</script>
<style scoped>
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
    transform: scaleX(-1);
}

.local-video {
    width: 30%;
    height: auto;
    position: absolute;
    right: 0;
    top: 0;
    transform: scaleX(-1);
}

.phoneing-quit {
    margin-bottom: 10%;
}
.rev-tips{
    display: flex;
    flex-wrap: wrap;
    align-content:space-between;
    justify-content:space-between;
    width: 40%;
}
.times{
    width:100%;
    background-color: white;
    text-align: center;
}
</style>