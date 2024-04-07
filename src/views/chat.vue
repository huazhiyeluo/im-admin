<template>
    <div>
        <van-nav-bar border fixed @click-left="clickLeft">
            <template #title>
                <div v-if="!(state.showType == 1 || state.showType == 2)" v-html="state.title"></div>
                <div v-if="state.showType == 1">
                    <van-image :src="state.talkData.icon" width="22" height="22" round />
                    <span class="bar-text">{{ state.talkData.name }}({{ state.talkData.toId }})</span>
                </div>
                <div v-if="state.showType == 2">
                    <van-image :src="state.talkData.icon" width="22" height="22" round />
                    <span class="bar-text">{{ state.talkData.name }}({{ state.talkData.toId }})</span>
                </div>
            </template>
            <template #left v-if="state.showType > 0">
                <van-icon name="arrow-left" size="18" />
                <span>返回</span>
            </template>
            <template #right v-if="state.showType == 0">
                <van-badge :content="state.badge" :show-zero="false">
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
            <van-tabbar-item name="friend" icon="chat-o">好友</van-tabbar-item>
            <van-tabbar-item name="group" icon="friends-o">群聊</van-tabbar-item>
            <van-tabbar-item name="person" icon="user-o">我的</van-tabbar-item>
        </van-tabbar>

        <FriendComponent v-show="state.tabActiveName == 'friend' && state.showType == 0" ref="FriendRef"
            @update-parameter="childOperateFriend" :db="state.db" />
        <GroupComponent v-show="state.tabActiveName == 'group' && state.showType == 0" ref="GroupRef"
            @update-parameter="childOperateGroup" :db="state.db" />
        <PersonComponent v-show="state.tabActiveName == 'person' && state.showType == 0" ref="PersonRef"
            @update-parameter="childOperatePerson" />

        <TalkComponent v-show="(state.showType == 1 || state.showType == 2)" ref="TalkRef"
            @update-parameter="childOperateTalk" @update-parameter-go-phone="childOperateGoPhone" :socket="state.socket"
            :db="state.db" :talkData="state.talkData" />

        <PersonUserComponent v-show="state.showType == 3" ref="PersonUserRef"
            @update-parameter="childOperatePersonUser" />

        <PersonGroupComponent v-show="state.showType == 4" ref="PersonGroupRef"
            @update-parameter="childOperatePersonGroup" />

        <MsgComponent v-show="state.showType == 5" ref="MsgRef" @update-parameter="childOperateMsg" :db="state.db" />

        <PhoneComponent v-show="state.isShowPhone" ref="PhoneRef" @update-parameter="childOperatePhone"
            @update-parameter-go-phone-request="childOperateGoPhoneRequest"
            @update-parameter-go-phone-response="childOperateGoPhoneResponse" @update-parameter-send="sendMessage"
            :db="state.db" :phoneData="state.phoneData" :talkData="state.talkData" />


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
import { saveGroupUser, saveUser } from '@/utils/dbsave';

import { useRouter } from 'vue-router';
import { showNotify } from 'vant';
import { inArray } from '@/utils/common';
import { stat } from 'fs';
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
    if (!state.selftUserInfo || !state.selftUserInfo.Uid) {
        Session.clear();
        nextTick()
        state.socket = null
        router.push('/login');
    }

    initWebsocket()
    heartbeatTimer.value = setInterval(() => { heartbeat() }, 10000);

    //设置indexedDB
    const dbName = `chat_${state.selftUserInfo.Uid}`

    const version = 1;
    const objectStores = [
        { name: 'groups', keyPath: 'GroupId', indexes: [{ name: 'GroupId', keyPath: 'GroupId', options: { unique: true } }] },
        { name: 'group_members', keyPath: 'Id', indexes: [{ name: 'GroupId', keyPath: 'GroupId' }, { name: 'MemberId', keyPath: 'MemberId' }] },
        { name: 'users', keyPath: 'Uid', indexes: [{ name: 'Uid', keyPath: 'Uid', options: { unique: true } }] },
        { name: 'message', keyPath: 'Id', indexes: [{ name: 'CreateTime', keyPath: 'CreateTime' }, { name: 'FromId', keyPath: 'FromId' }, { name: 'ToId', keyPath: 'ToId' }, { name: 'MsgType', keyPath: 'MsgType' }] },
        { name: 'apply', keyPath: 'Id', indexes: [{ name: 'OperateTime', keyPath: 'OperateTime' }, { name: 'Type', keyPath: 'Type' }] },
    ];
    state.db = await openDB(dbName, version, objectStores);
    saveUser(state.db, { Uid: state.selftUserInfo.Uid, Username: state.selftUserInfo.Username, Avatar: state.selftUserInfo.Avatar, IsOnline: true })
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
}

const goMsg = () => {
    state.title = "消息盒子"
    state.showType = 5
    state.badge = 0
}

// --------------------------------------------------------------------- friend ------------------------------------------------------------------------
const onFriendSelect = async (action: any, index: number) => {
    console.log("onFriendSelect", action, index)
    if (index == 0) {
        onFriendDel(state.selftUserInfo.Uid, state.talkData.toId)
    }
    if (index == 1) {
        onFriendClear(state.selftUserInfo.Uid, state.talkData.toId)
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
    if (temp.OwnerUid == state.selftUserInfo.Uid) {
        state.groupActions[0].text = "解散群聊"
    }
}

const onGroupSelect = async (action: any, index: number) => {
    console.log("onFriendSelect", action, index)
    if (index == 0) {
        onGroupQuit(state.selftUserInfo.Uid, state.talkData.toId)
    }
    if (index == 1) {
        onGroupClear(state.selftUserInfo.Uid, state.talkData.toId)
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

const clearMsg = () => {
    MsgRef.value.clearMsg()
}


// --------------------------------------------------------------------- socket ------------------------------------------------------------------------
const initWebsocket = () => {
    console.log("启动服务器连接")

    state.socket = new WebSocket(import.meta.env.VITE_WS_URL + "/chat?uid=" + state.selftUserInfo.Uid);

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
        const content =
            sendMessage({ FromId: state.selftUserInfo.Uid, Content: { "Data": "心跳" }, MsgMedia: 0, MsgType: 0 })
    }
}


const onMessage = (event: any) => {
    const data = JSON.parse(event.data);
    console.log("onMessage-parent", data);
    if (inArray(data.MsgType, [1, 2])) {
        // 处理接收到的消息
        TalkRef.value.onMessage(event);
    } else if (inArray(data.MsgType, [3])) {
        if (data.MsgMedia == 10) {
            loadDisconnect()
        }
        if (inArray(data.MsgMedia, [11, 12])) {
            loadUserStatus(data)
        }
        if (inArray(data.MsgMedia, [21, 22, 23, 24])) {
            loadUserManage(data)
        }
        if (inArray(data.MsgMedia, [30, 31, 32, 33, 34])) {
            loadGroupManage(data)
        }
    } else if (inArray(data.MsgType, [4])) {
        if (inArray(data.MsgMedia, [0, 1, 2, 3, 4, 5])) {
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
// 2、上线、下线
const loadUserStatus = (data: any) => {
    if (data.ToId == state.selftUserInfo.Uid) {
        FriendRef.value.loadUserStatus(data)
    }
}
// 3、好友增删查改
const loadUserManage = (data: any) => {
    if (inArray(data.MsgMedia, [21, 22, 23])) {
        MsgRef.value.loadUserManage(data)
        if (state.showType != 4) {
            state.badge++
        }
    }
    FriendRef.value.loadUserManage(data)
}

// 4、组增删查改
const loadGroupManage = (data: any) => {
    if (inArray(data.MsgMedia, [31, 32, 33])) {
        MsgRef.value.loadUserManage(data)
        if (state.showType != 4) {
            state.badge++
        }
    }
    GroupRef.value.loadUserManage(data)
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
    state.talkData = {
        msgType: msgType,
        toId: toId,
        name: temp.Username,
        icon: temp.Avatar
    }
    state.showType = 1
}

const childOperateGroup = async (msgType: number, toId: number) => {
    if (!state.db) {
        return
    }
    const temp = await getItemById(state.db, "groups", toId)
    state.talkData = {
        msgType: msgType,
        toId: toId,
        name: temp.Name,
        icon: temp.Icon
    }

    const contacts = await getByIndex(state.db, "group_members", 'GroupId', toId)
    if (contacts.length == 0) {
        const response = await getGroupUser({ groupId: toId });
        for (const friend of response.data) {
            saveGroupUser(state.db, toId, friend)
        }
    }
    state.showType = 2
}

const childOperateTalk = () => {
    initWebsocket()
}

//拨打电话
const childOperateGoPhone = async (toId: number) => {
    console.log("childOperateGoPhone", toId)
    if (!state.db) {
        return
    }
    const temp = await getItemById(state.db, "users", toId)
    state.talkData = {
        msgType: 1,
        toId: toId,
        name: temp.Username,
        icon: temp.Avatar
    }
    state.isShowPhone = true
    PhoneRef.value.goPhone()
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

const childOperatePersonUser = () => {
    changeTabbar()
    state.showType = 0
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

const sendMessage = (data: MsgData) => {
    TalkRef.value.sendMessage(data)
}

//收到电话请求
const childOperateGoPhoneRequest = async (toId: number) => {
    console.log("childOperateGoPhone", toId)
    if (!state.db) {
        return
    }
    const temp = await getItemById(state.db, "users", toId)
    state.talkData = {
        msgType: 1,
        toId: toId,
        name: temp.Username,
        icon: temp.Avatar
    }
    state.isShowPhone = true
}

//收到电话响应（接通）
const childOperateGoPhoneResponse = async () => {
    console.log("childOperateGoPhoneResponse")
    state.showType = 1
}



</script>