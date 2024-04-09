<template>
    <div class="person-list">
        <ul>
            <!-- 个人头像 -->
            <li @click="setPersonInfo" class="my-person">
                <van-image width="50" height="50" round :src="state.selftUserInfo.Avatar" />
                <span>{{ state.selftUserInfo.Username }} [{{ state.selftUserInfo.Uid }}]</span>
            </li>
            <!-- 添加好友 -->
            <li @click="goAddFriend" class="friend">添加好友</li>

            <!-- 加入群聊 -->
            <li @click="goJoinGroup">加入群聊</li>

            <!-- 创建群聊 -->
            <li @click="createGroup">创建群聊</li>
        </ul>
        <!-- 退出登录 -->
        <van-button round block type="danger" size="small" native-type="submit" @click="logout">退出登录</van-button>
        <van-dialog v-model:show="state.showAddFriend" title="添加好友" show-cancel-button @confirm="doAddFriend">
            <van-field v-model="state.addFriendForm.toId" label="" placeholder="请输入UID" />
            <van-field v-model="state.addFriendForm.reason" type="textarea" label="" placeholder="请输入理由" />
        </van-dialog>
        <van-dialog v-model:show="state.showJoinGroup" title="加入群聊" show-cancel-button @confirm="doJoinGroup">
            <van-field v-model="state.joinGroupForm.toId" label="" placeholder="请输入群号" />
            <van-field v-model="state.joinGroupForm.reason" type="textarea" label="" placeholder="请输入理由" />
        </van-dialog>
    </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast } from 'vant';
import { Session } from '@/utils/storage';
import type { UserInfo } from '@/utils/schema';

import { addFriend, joinGroup } from '@/api/index';


const router = useRouter();
const emit = defineEmits(['update-parameter-person'])

const state = reactive({
    selftUserInfo: {} as UserInfo,
    showAddFriend: false,
    addFriendForm: {
        "fromId": 0,
        "toId": "",
        "reason": "",
    },
    showJoinGroup: false,
    joinGroupForm: {
        "fromId": 0,
        "toId": "",
        "reason": "",
    },
});


onMounted(() => {
    init()
});
const init = () => {
    state.selftUserInfo = Session.get('userInfo')
};

const reloadUserInfo = () => {
    state.selftUserInfo = Session.get('userInfo')
};


// 初始化表格数据

const goAddFriend = async () => {
    state.showAddFriend = true
}
const doAddFriend = async () => {
    let updateData = JSON.parse(JSON.stringify(state.addFriendForm));
    updateData["fromId"] = state.selftUserInfo.Uid
    addFriend(updateData).then((response: any) => {
        if (response.code == 0) {
            showSuccessToast('添加成功');
            state.addFriendForm = {
                "fromId": 0,
                "toId": "",
                "reason": "",
            }
        } else {
            showFailToast(response.msg);
        }
    });
}


const goJoinGroup = async () => {
    state.showJoinGroup = true
}

const doJoinGroup = async () => {
    let updateData = JSON.parse(JSON.stringify(state.joinGroupForm));
    updateData["fromId"] = state.selftUserInfo.Uid
    joinGroup(updateData).then((response: any) => {
        if (response.code == 0) {
            showSuccessToast('加入成功');
            state.joinGroupForm = {
                "fromId": 0,
                "toId": "",
                "reason": "",
            }
        } else {
            showFailToast(response.msg);
        }
    });
}


const setPersonInfo = async () => {
    emit("update-parameter-person", 1, "修改资料")
}
const createGroup = async () => {
    emit("update-parameter-person", 2, "创建群聊")
}


const logout = async () => {
    Session.clear()
    router.push('/login');
}


// 暴露变量
defineExpose({
  reloadUserInfo
});

</script>

<style scoped>
.person-list {
    margin-top: 46px;
    height: calc(100vh - 46px);
    overflow-y: auto;
    padding: 10px;
    background-color: #fff;
}

.person-list ul {
    list-style: none;
    padding: 10px;
}

.person-list ul li {
    padding: 10px 0;
    line-height: 40px;
    border-bottom: 1px solid #ccc;
}

.person-list .my-person {
    height: 80px;
}

.person-list .my-person .van-image {
    float: left;
}

.person-list .my-person span {
    float: left;
    margin-left: 10px;
}

.person-list .friend {
    clear: both;
}

.line-button {
    display: block;
    margin-top: 10px;
    width: 100%;
}
</style>