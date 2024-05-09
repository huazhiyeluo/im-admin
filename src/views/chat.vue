<template>
    <div>
        <van-nav-bar border fixed @click-left="clickLeft">
            <template #title>
                <div v-if="!(state.showType == 1 || state.showType == 2)" v-html="state.title"></div>
                <div v-if="state.showType == 1 || state.showType == 2" class="chat-title">
                    <van-image :src="state.talkData.icon" width="22" height="22" round />
                    <span class="bar-text">{{ state.talkData.name }}({{ state.talkData.toId }})</span>
                </div>
            </template>
            <template #left v-if="state.showType > 0">
                <van-icon name="arrow-left" size="18" />
                <span>返回</span>
            </template>
            <template #right v-if="state.showType == 0">
                <van-badge :content="state.badge" :show-zero="false" :max="99">
                    <van-icon name="more-o" size="18" @click="goMsg" />
                </van-badge>
            </template>
            <template #right v-if="state.showType == 1">
                <van-popover placement="bottom-end" v-model:show="state.showFriendPopover"
                    :actions="state.friendActions" @select="onFriendSelect">
                    <template #reference>
                        <van-icon name="ellipsis" size="18" />
                    </template>
                </van-popover>
            </template>
            <template #right v-if="state.showType == 2">
                <van-popover placement="bottom-end" v-model:show="state.showGroupPopover" @open="onGroupOpen"
                    :actions="state.groupActions" @select="onGroupSelect">
                    <template #reference>
                        <van-icon name="ellipsis" size="18" />
                    </template>
                </van-popover>
            </template>
            <template #right v-if="state.showType == 5">
                <van-icon name="brush-o" size="18" @click="clearMsg" />
            </template>
        </van-nav-bar>
        <van-tabbar v-if="state.showType == 0" v-model="state.tabActiveName" @change="changeTabbar">
            <van-tabbar-item name="friend" icon="chat-o" :badge="state.tipsData.friend"
                :badge-props="state.tipsData.friendProps">好友</van-tabbar-item>
            <van-tabbar-item name="group" icon="friends-o" :badge="state.tipsData.group"
                :badge-props="state.tipsData.groupProps">群聊</van-tabbar-item>
            <van-tabbar-item name="person" icon="user-o">我的</van-tabbar-item>
        </van-tabbar>

        <FriendComponent v-show="state.tabActiveName == 'friend' && state.showType == 0" ref="FriendRef" :db="state.db"
            @update-parameter-friend="childOperateFriend" @update-parameter-friend-tips="childOperateFriendTips" />
        <GroupComponent v-show="state.tabActiveName == 'group' && state.showType == 0" ref="GroupRef" :db="state.db"
            @update-parameter-group="childOperateGroup" @update-parameter-group-tips="childOperateGroupTips" />
        <PersonComponent v-show="state.tabActiveName == 'person' && state.showType == 0" ref="PersonRef"
            @update-parameter-person="childOperatePerson" />

        <TalkComponent v-show="(state.showType == 1 || state.showType == 2)" ref="TalkRef" :db="state.db"
            :talkData="state.talkData" :socket="state.socket" @update-parameter-talk="childOperateTalk"
            @update-parameter-talk-phone="childOperateTalkPhone" @update-parameter-talk-msg="childOperateTalkMsg"
            @update-parameter-talk-tips="childOperateTalkTips" />

        <PersonUserComponent v-show="state.showType == 3" ref="PersonUserRef"
            @update-parameter-person-user="childOperatePersonUser" />

        <PersonGroupComponent v-show="state.showType == 4" ref="PersonGroupRef"
            @update-parameter-person-group="childOperatePersonGroup" />

        <MsgComponent v-show="state.showType == 5" ref="MsgRef" :db="state.db"
            @update-parameter-msg="childOperateMsg" />

        <PhoneComponent v-show="state.isShowPhone" ref="PhoneRef" :db="state.db" :phoneData="state.phoneData"
            :talkData="state.talkData" @update-parameter="childOperatePhone"
            @update-parameter-phone-request="childOperatePhoneRequest"
            @update-parameter-phone-response="childOperatePhoneResponse"
            @update-parameter-phone-send="childOperatePhoneSend" />
    </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, defineAsyncComponent } from 'vue'
import { showConfirmDialog, showSuccessToast, showFailToast } from 'vant';
import { Session } from '@/utils/storage';
import { openDB, getItemById, getByIndex } from '@/utils/indexedDB';
import type { MyDatabase } from '@/utils/indexedDB';
import type { MsgData, UserInfo } from '@/utils/schema';
import { getGroupUser, delFriend, quitGroup } from '@/api/index';
import { getImg, saveGroupUser, saveUser } from '@/utils/dbsave';

import { useRouter } from 'vue-router';
import { showNotify } from 'vant';
import { inArray } from '@/utils/common';
const router = useRouter();

const FriendComponent = defineAsyncComponent(() => import('@/views/chat/friend.vue'));
const GroupComponent = defineAsyncComponent(() => import('@/views/chat/group.vue'));
const TalkComponent = defineAsyncComponent(() => import('@/views/chat/talk.vue'));
const MsgComponent = defineAsyncComponent(() => import('@/views/chat/msg.vue'));
const PhoneComponent = defineAsyncComponent(() => import('@/views/chat/phone.vue'));
const PersonComponent = defineAsyncComponent(() => import('@/views/user/person.vue'));
const PersonUserComponent = defineAsyncComponent(() => import('@/views/user/user.vue'));
const PersonGroupComponent = defineAsyncComponent(() => import('@/views/user/group.vue'));


const TalkRef = ref();
const FriendRef = ref();
const GroupRef = ref();
const MsgRef = ref();
const PhoneRef = ref();
const PersonRef = ref();


const heartbeatTimer = ref<NodeJS.Timeout | number>(0);
const reconnectTimer = ref<NodeJS.Timeout | number>(0);

const isPageVisible = ref(true); // 默认页面可见


const state = reactive({
    socket: null as WebSocket | null,
    db: null as MyDatabase | null,
    title: "联系人",
    tabActiveName: "friend",
    selftUserInfo: {} as UserInfo,
    showType: 0,        // 1  friend-talk 2 group-talk 3 user 4 group 5 msg
    badge: 0,
    talkData: {
        msgType: 0,                     // 1、联系人 2、群组
        toId: 0,                        // 聊天对象
        name: "",
        icon: "",
    },
    showFriendPopover: false,
    friendActions: [
        { text: '删除好友', icon: 'delete-o' },
        { text: '清空记录', icon: 'brush-o' },
    ],
    showGroupPopover: false,
    groupActions: [
        { text: '退出群聊', icon: 'delete-o' },
        { text: '清空记录', icon: 'brush-o' },
    ],
    isShowPhone: false,
    phoneData: {
        showType: 0,
    },
    tipsData: {
        friend: 0,
        friendProps: {
            'show-zero': false,
            'max': 99,
        },
        group: 0,
        groupProps: {
            'show-zero': false,
            'max': 99,
        },
    }
});

onMounted(() => {
    console.log("onMounted");
    document.addEventListener('visibilitychange', handleVisibilityChange);
    init()
});

onUnmounted(() => {
    console.log("onUnmounted");
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(heartbeatTimer.value)
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.close(1000, "onUnmounted");
    }
})


const handleVisibilityChange = () => {
    // 更新 isPageVisible 的值为当前页面的可见状态
    isPageVisible.value = !document.hidden;
    // 如果页面变为可见，可以在这里执行一些操作
    if (isPageVisible.value) {
        console.log('页面已变为可见');
        if (state.socket && state.socket.readyState !== WebSocket.OPEN) {
            initWebsocket()
        }
    } else {
        console.log('页面已变为不可见');
    }
};

const init = async () => {
    state.selftUserInfo = Session.get('userInfo')
    if (!state.selftUserInfo || !state.selftUserInfo.uid) {
        Session.clear();
        nextTick()
        state.socket = null
        router.push('/login');
    }

    initWebsocket()
    heartbeatTimer.value = setInterval(() => { heartbeat() }, 10000);

    //设置indexedDB
    const dbName = `chat_${state.selftUserInfo.uid}`

    const version = 1;
    const objectStores = [
        { name: 'groups', keyPath: 'groupId', indexes: [{ name: 'groupId', keyPath: 'groupId', options: { unique: true } }] },
        { name: 'group_members', keyPath: 'Id', indexes: [{ name: 'groupId', keyPath: 'groupId' }, { name: 'memberId', keyPath: 'memberId' }] },
        { name: 'users', keyPath: 'uid', indexes: [{ name: 'uid', keyPath: 'uid', options: { unique: true } }] },
        { name: 'message', keyPath: 'id', indexes: [{ name: 'createTime', keyPath: 'createTime' }, { name: 'fromId', keyPath: 'fromId' }, { name: 'toId', keyPath: 'toId' }, { name: 'msgType', keyPath: 'msgType' }] },
        { name: 'apply', keyPath: 'id', indexes: [{ name: 'operateTime', keyPath: 'operateTime' }, { name: 'type', keyPath: 'type' }] },
        { name: 'file', keyPath: 'url', indexes: [{ name: 'url', keyPath: 'url' }, { name: 'data', keyPath: 'data' }] },
    ];
    state.db = await openDB(dbName, version, objectStores);
    saveUser(state.db, { uid: state.selftUserInfo.uid, username: state.selftUserInfo.username, avatar: state.selftUserInfo.avatar, isOnline: true })
};


const changeTabbar = () => {
    if (state.tabActiveName == 'friend') {
        state.title = '联系人'
    } else if (state.tabActiveName == 'group') {
        state.title = '群聊'
    } else if (state.tabActiveName == 'person') {
        state.title = '个人中心'
    }
}

const clickLeft = () => {
    changeTabbar()
    state.showType = 0
    state.talkData = {
        msgType: 0,
        toId: 0,
        name: "",
        icon: "",
    }
}


// --------------------------------------------------------------------- friend ------------------------------------------------------------------------
const onFriendSelect = async (action: any, index: number) => {
    console.log("onFriendSelect", action, index)
    if (index == 0) {
        onFriendDel(state.selftUserInfo.uid, state.talkData.toId)
    }
    if (index == 1) {
        onFriendClear(state.selftUserInfo.uid, state.talkData.toId)
    }
}

const onFriendDel = (fromId: number, toId: number) => {
    showConfirmDialog({ title: '删除好友', message: `是否删除:${state.talkData.name}?` })
        .then(() => {
            delFriend({ fromId: fromId, toId: toId }).then((response: any) => {
                if (response.code == 0) {
                    showSuccessToast('删除成功');
                    clickLeft()
                } else {
                    showFailToast(response.msg);
                }
            });
        });
}

const onFriendClear = (fromId: number, toId: number) => {
    TalkRef.value.clearMessage(1, fromId, toId)
}

// --------------------------------------------------------------------- group ------------------------------------------------------------------------
const onGroupOpen = async () => {
    if (!state.db) {
        return
    }
    state.groupActions[0].text = "退出群聊"
    const temp = await getItemById(state.db, "groups", state.talkData.toId)
    if (temp.Owneruid == state.selftUserInfo.uid) {
        state.groupActions[0].text = "解散群聊"
    }
}

const onGroupSelect = async (action: any, index: number) => {
    console.log("onFriendSelect", action, index)
    if (index == 0) {
        onGroupQuit(state.selftUserInfo.uid, state.talkData.toId)
    }
    if (index == 1) {
        onGroupClear(state.selftUserInfo.uid, state.talkData.toId)
    }
}

const onGroupQuit = (fromId: number, toId: number) => {
    showConfirmDialog({ title: '退出群', message: `是否退出:${state.talkData.name}群?` })
        .then(() => {
            quitGroup({ fromId: fromId, toId: toId }).then((response: any) => {
                if (response.code == 0) {
                    showSuccessToast('退出成功');
                    clickLeft()
                } else {
                    showFailToast(response.msg);
                }
            });
        });
}


const onGroupClear = (fromId: number, toId: number) => {
    TalkRef.value.clearMessage(2, fromId, toId)
}
// --------------------------------------------------------------------- msg ------------------------------------------------------------------------


const goMsg = () => {
    state.title = "消息盒子"
    state.showType = 5
    state.badge = 0
}

const clearMsg = () => {
    MsgRef.value.clearMsg()
}


// --------------------------------------------------------------------- socket ------------------------------------------------------------------------
const initWebsocket = () => {
    console.log("启动服务器连接")

    state.socket = new WebSocket(import.meta.env.VITE_WS_URL + "/chat?uid=" + state.selftUserInfo.uid);

    // 处理连接打开事件
    state.socket.addEventListener("open", onOpen);

    // 处理接收消息事件
    state.socket.addEventListener("message", onMessage);

    // 处理连接关闭事件
    state.socket.addEventListener("close", onClose);

    // 处理错误事件
    state.socket.addEventListener("error", onError);
}

const onOpen = (event: any) => {
    console.log("WebSocket connection opened", event);
    // 连接成功时清除重连定时器
    if (reconnectTimer.value) {
        clearTimeout(reconnectTimer.value);
    }
}

const onClose = (event: any) => {
    console.log("您已自动下线") //code 1006
    if (event.code !== 1000) {
        // 异常关闭，进行重连
        console.error("WebSocket connection closed with code:", event.code);
        if (!reconnectTimer.value) {
            reconnectTimer.value = setTimeout(initWebsocket, 5000); // 2秒后重新连接
        }
    }

}

const onError = (event: any) => {
    console.error("WebSocket error:", event);
    // 连接错误时进行重连
    if (!reconnectTimer.value) {
        reconnectTimer.value = setTimeout(initWebsocket, 5000); // 2秒后重新连接
    }
}

const heartbeat = () => {
    if (!state.socket) {
        return
    }
    if (state.socket.readyState == 1) {
        TalkRef.value.sendMessage({ fromId: state.selftUserInfo.uid, content: { "data": "心跳" }, msgMedia: 0, msgType: 0 })
    }
}


const onMessage = (event: any) => {
    const data = JSON.parse(event.data);
    console.log("onMessage-parent", data);
    if (inArray(data.msgType, [1, 2])) {
        // 处理接收到的消息
        TalkRef.value.onMessage(event);
        let num: number = 1
        if (data.msgType == 1) {
            if (data.fromId == state.talkData.toId) {
                num = 0
            }
            FriendRef.value.loadFriendMsg(data, num)
        }
        if (data.msgType == 2) {
            if (data.toId == state.talkData.toId) {
                num = 0
            }
            GroupRef.value.loadGroupMsg(data, num)
        }
    } else if (inArray(data.msgType, [3])) {
        console.log("onMessage-parent-3", data);
        if (data.msgMedia == 10) {
            loadDisconnect()
        }
        if (inArray(data.msgMedia, [11, 12])) {
            loadFriendStatus(data)
        }
        if (inArray(data.msgMedia, [13])) {
            loadFriendInfo(data)
        }
        if (inArray(data.msgMedia, [21, 22, 23, 24])) {
            console.log("onMessage-parent-3-21", data);
            loadFriendManage(data)
        }
        if (inArray(data.msgMedia, [30, 31, 32, 33, 34, 35])) {
            loadGroupManage(data)
        }
    } else if (inArray(data.msgType, [4])) {
        if (inArray(data.msgMedia, [0, 1, 2, 3, 4, 5])) {
            loadPhoneManage(data)
        }
    }
}

// 1、挤账号
const loadDisconnect = () => {
    showNotify({ type: 'danger', message: '您的账号在其他地方登录，请检查' });
    Session.clear();
    nextTick()
    state.socket = null
    router.push('/login');
}
// 2-1、上线、下线
const loadFriendStatus = (data: any) => {
    if (data.toId == state.selftUserInfo.uid) {
        FriendRef.value.loadFriendStatus(data)
    }
}

// 2-2、用户信息
const loadFriendInfo = (data: any) => {
    if (data.toId == state.selftUserInfo.uid) {
        FriendRef.value.loadFriendInfo(data)
    }
}


// 3、好友增删查改
const loadFriendManage = (data: any) => {
    console.log("onMessage-parent-3-21", data);
    if (inArray(data.msgMedia, [21, 22, 23])) {  //21 添加好友 //22成功添加好友 //23拒绝添加好友
        MsgRef.value.loadMsgManage(data)
        if (state.showType != 5) {
            console.log(1111);
            state.badge++
        }
    }
    FriendRef.value.loadFriendManage(data)
}

// 4、组增删查改
const loadGroupManage = (data: any) => {
    if (inArray(data.msgMedia, [31, 32, 33])) {//31 添加群 //32成功添加群 //33拒绝添加群
        MsgRef.value.loadMsgManage(data)
        if (state.showType != 5) {
            state.badge++
        }
    }

    if (data.msgMedia == 35 && state.talkData.msgType == 2) {
        const res = JSON.parse(data.Content.Data);
        if (res.group.groupId == state.talkData.toId) {
            clickLeft()
        }
    }

    GroupRef.value.loadGroupManage(data)
}

// 5、消息管理
const loadPhoneManage = (data: any) => {
    PhoneRef.value.loadPhoneManage(data)
}



// --------------------------------------------------------------------- Operate ------------------------------------------------------------------------

const childOperateFriend = async (msgType: number, toId: number) => {
    if (!state.db) {
        return
    }
    const temp = await getItemById(state.db, "users", toId)

    const icon = await getImg(state.db, temp.avatar)
    state.talkData = {
        msgType: msgType,
        toId: toId,
        name: temp.username,
        icon: icon
    }
    state.showType = 1
}

const childOperateFriendTips = async (num: number) => {
    state.tipsData.friend += num
}

const childOperateGroup = async (msgType: number, toId: number) => {
    if (!state.db) {
        return
    }
    const temp = await getItemById(state.db, "groups", toId)
    const icon = await getImg(state.db, temp.icon)
    state.talkData = {
        msgType: msgType,
        toId: toId,
        name: temp.Name,
        icon: icon
    }

    const contacts = await getByIndex(state.db, "group_members", 'groupId', toId)
    if (contacts.length == 0) {
        const response = await getGroupUser({ groupId: toId });
        for (const friend of response.data) {
            saveGroupUser(state.db, toId, friend)
        }
    }
    state.showType = 2
}

const childOperateGroupTips = async (num: number) => {
    state.tipsData.group += num
}

const childOperatePerson = (editType: number, title: string) => {
    if (editType == 1) {
        state.showType = 3
    }
    if (editType == 2) {
        state.showType = 4
    }
    state.title = title
}



const childOperateTalk = () => {
    initWebsocket()
}

//拨打电话
const childOperateTalkPhone = async (toId: number) => {
    console.log("childOperateTalkPhone", toId)
    if (!state.db) {
        return
    }
    const temp = await getItemById(state.db, "users", toId)
    state.talkData = {
        msgType: 1,
        toId: toId,
        name: temp.username,
        icon: temp.avatar
    }
    state.isShowPhone = true
    PhoneRef.value.goPhone()
}


// 本地消息处理
const childOperateTalkMsg = (data: MsgData) => {
    if (data.msgType == 1) {
        FriendRef.value.loadFriendMsg(data, 0)
    }
    if (data.msgType == 2) {
        GroupRef.value.loadGroupMsg(data, 0)
    }
}


const childOperateTalkTips = async (type: number, num: number) => {
    if (type == 1) {
        state.tipsData.friend += num
    }
    if (type == 2) {
        state.tipsData.group += num
    }
}




const childOperatePersonUser = () => {
    changeTabbar()
    state.showType = 0

    //同步person组件数据
    PersonRef.value.reloadUserInfo()
}

const childOperatePersonGroup = () => {
    changeTabbar()
    state.showType = 0
}

const childOperateMsg = () => {
    state.showType = 0
}

const childOperatePhone = () => {

}

const childOperatePhoneSend = (data: any) => {
    TalkRef.value.sendMessage(data)
}

//收到电话请求
const childOperatePhoneRequest = async (toId: number) => {
    console.log("childOperatePhoneRequest", toId)
    if (!state.db) {
        return
    }
    const temp = await getItemById(state.db, "users", toId)
    state.talkData = {
        msgType: 1,
        toId: toId,
        name: temp.username,
        icon: temp.avatar
    }
    state.isShowPhone = true
}

//收到电话响应（接通）
const childOperatePhoneResponse = async () => {
    console.log("childOperatePhoneResponse")
    state.showType = 1
}



</script>
<style scoped>
.chat-title .van-image {
    float: left;
}

.chat-title span {
    float: left;
    margin-left: 5px;
}
</style>