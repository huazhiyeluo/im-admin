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
                        <van-icon name="phone-o" />{{ getContent(item) }}
                    </p>
                    <p v-if="item.MsgMedia == 8">
                        <van-icon name="phone-o" />通话时长: {{ formatSeconds(getContent(item)) }}
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
    </div>

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { showImagePreview } from 'vant';
import { formatTime, formatSeconds } from '@/utils/formatTime';
import type { UserInfo, MsgData } from '@/utils/schema';
import { Session } from '@/utils/storage';
import { inArray } from '@/utils/common';
import { upload } from '@/api/index';
import { addItem, deleteByMultipleIndexes, getByTimeIndex, getItemById } from '@/utils/indexedDB';

const props = defineProps(['db', 'socket', 'talkData'])
const emit = defineEmits(['update-parameter', 'update-parameter-go-phone'])

const chatMessages = ref<HTMLElement | null>(null);
const pluginRef = ref<HTMLElement | null>(null);
const showPluginRef = ref<HTMLElement | null>(null);

const smileRef = ref<HTMLElement | null>(null);
const showSmileRef = ref<HTMLElement | null>(null);

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


const init = async () => {
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
    const classstr = item.FromId === state.selftUserInfo.Uid ? 'message user-message' : 'message other-message'
    if (item.MsgType == 1 && item.MsgMedia == 7) {
        return "message user-message"
    }
    return classstr
}

const setChatList = async () => {
    if (Object.keys(state.historyContentList).length === 0) {
        let nowtime = Math.floor(Date.now() / 1000)
        const temps = await getByTimeIndex(props.db, "message", "CreateTime", nowtime - 24 * 3600 * 30, nowtime)
        console.log("setChatList", temps)
        for (let temp of temps) {
            const msgData = temp as unknown as MsgData
            const rkey = getKey(msgData.MsgType, msgData.FromId, msgData.ToId)
            if (!state.historyContentList.hasOwnProperty(rkey)) {
                state.historyContentList[rkey] = []
            }
            state.historyContentList[rkey].push(msgData)
        }
    }
    console.log("setChatList", state.historyContentList)

    setTimeout(setScroll, 1); // 1毫秒后滚动
}


const getContent = (item: MsgData) => {

    if (inArray(item.MsgMedia, [1, 7, 8])) {
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
    // if (data.MsgType == 4) {
    console.log("sendMessage", JSON.parse(jsonString))
    // }

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


const goPhone = () => {
    emit("update-parameter-go-phone", props.talkData.toId)
    state.isShowPlugin = false
}



// 暴露变量
defineExpose({
    onMessage,
    sendMessage,
    clearMessage,
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
</style>