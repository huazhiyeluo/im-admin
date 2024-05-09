<template>
    <div class="msg-list">
        <div v-for="(item, key) in state.applys" v-if="state.applys.length > 0">
            <div class="contact-item" v-if="item.type == 1 && item.fromId == state.selftUserInfo.uid">
                <van-image width="50" height="50" round :src="item.toIcon" />
                <div class="user-details">
                    <div class="user-name">{{ item.toName }}</div>
                    <div class="status">
                        <span>请求添加对方为好友</span>
                        <span>，附言：{{ item.reason }}</span>
                    </div>
                </div>
                <div class="user-operate">
                    <div class="operate" v-if="item.status == 0">
                        <div class="operate-right-30">等待验证</div>
                    </div>
                    <div class="operate" v-if="item.status == 1">
                        <div class="operate-right">已被同意</div>
                    </div>
                    <div class="operate" v-if="item.status == 2">
                        <div class="operate-right">已被拒绝</div>
                    </div>
                </div>
            </div>
            <div class="contact-item" v-if="item.type == 1 && item.toId == state.selftUserInfo.uid">
                <van-image width="50" height="50" round :src="item.fromIcon" />
                <div class="user-details">
                    <div class="user-name">{{ item.fromName }}</div>
                    <div class="status">
                        <span>对方请求添加你为好友</span>
                        <span>，附言：{{ item.reason }}</span>
                    </div>
                </div>
                <div class="user-operate">
                    <div class="operate" v-if="item.status == 0"><van-button type="success" size="small"
                            @click="goOperate(key, item.id, 1)">同意</van-button><van-button size="small"
                            @click="goOperate(key, item.id, 2)">拒绝</van-button></div>
                    <div class="operate" v-if="item.status == 1">
                        <div class="operate-right">已同意</div>
                    </div>
                    <div class="operate" v-if="item.status == 2">
                        <div class="operate-right">已拒绝</div>
                    </div>
                </div>
            </div>
            <div class="contact-item" v-if="item.type == 2 && item.fromId == state.selftUserInfo.uid">
                <van-image width="50" height="50" round :src="item.toIcon" />
                <div class="user-details">
                    <div class="user-name">{{ item.toName }}</div>
                    <div class="status">
                        <span>请求加入群</span>
                        <span>，附言：{{ item.reason }}</span>
                    </div>
                </div>
                <div class="user-operate">
                    <div class="operate" v-if="item.status == 0">
                        <div class="operate-right-30">等待验证</div>
                    </div>
                    <div class="operate" v-if="item.status == 1">
                        <div class="operate-right">已被同意</div>
                    </div>
                    <div class="operate" v-if="item.status == 2">
                        <div class="operate-right">已被拒绝</div>
                    </div>
                </div>
            </div>
            <div class="contact-item" v-if="item.type == 2 && item.fromId != state.selftUserInfo.uid">
                <van-image width="50" height="50" round :src="item.toIcon" />
                <div class="user-details">
                    <div class="user-name">{{ item.toName }}</div>
                    <div class="status">
                        <span><span style="color:red;">{{ item.fromName }}</span>请求加入群</span>
                        <span>，附言：{{ item.reason }}</span>
                    </div>
                </div>
                <div class="user-operate">
                    <div class="operate" v-if="item.status == 0"><van-button type="success" size="small"
                            @click="goOperate(key, item.id, 1)">同意</van-button><van-button size="small"
                            @click="goOperate(key, item.id, 2)">拒绝</van-button></div>
                    <div class="operate" v-if="item.status == 1">
                        <div class="operate-right">已同意</div>
                    </div>
                    <div class="operate" v-if="item.status == 2">
                        <div class="operate-right">已拒绝</div>
                    </div>
                </div>
            </div>
        </div>
        <van-empty description="暂无消息" v-if="state.applys.length == 0" />
    </div>
</template>


<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { showSuccessToast, showFailToast } from 'vant';
import { Session } from '@/utils/storage';
import type { UserInfo, ApplyData } from '@/utils/schema';

import { getApplyList, operateApply } from '@/api/index';
import { saveApply } from '@/utils/dbsave';
import { deleteByMultipleIndexes, getByTimeIndex } from '@/utils/indexedDB';

const props = defineProps(['db'])
const emit = defineEmits(['update-parameter-msg'])

const state = reactive({
    selftUserInfo: {} as UserInfo,
    applys: [] as ApplyData[],
});


onMounted(() => {
    init()
});
const init = () => {
    state.selftUserInfo = Session.get('userInfo')
    getList()
};


// 初始化表格数据
const getList = async () => {
    let nowtime = Math.floor(Date.now() / 1000)
    const temps = await getByTimeIndex(props.db, "apply", "operateTime", nowtime - 24 * 3600 * 30, nowtime)
    if (temps.length > 0) {
        for (let temp of temps) {
            const applyData = temp as unknown as ApplyData
            state.applys.unshift(applyData);
        }
    } else {
        getApplyList({ uid: state.selftUserInfo.uid }).then((response: any) => {
            if (response.data) {
                state.applys = response.data;
            }
        });
    }

};

const goOperate = async (key: number, id: number, status: number) => {
    let updateData = { id: id, status: status }
    operateApply(updateData).then((response: any) => {
        if (response.code == 0) {
            if (status == 1) {
                showSuccessToast('已同意');
            } else if (status == 2) {
                showSuccessToast('已拒绝');
            }
            state.applys[key].status = status

        } else {
            showFailToast(response.msg);
        }
    });
}

const loadMsgManage = (data: any) => {
    const res = JSON.parse(data.content.data);
    if (res.apply) {
        const existingApplyIndex = state.applys.findIndex(apply => apply.id === res.apply.id);
        if (existingApplyIndex !== -1) {
            state.applys[existingApplyIndex] = res.apply;
        } else {
            state.applys.unshift(res.apply);
        }
        saveApply(props.db, res.apply);
    }
}

const clearMsg = () => {
    state.applys = []
    deleteByMultipleIndexes(props.db, 'apply', [{ indexName: "type", value: 1 }])
    deleteByMultipleIndexes(props.db, 'apply', [{ indexName: "type", value: 2 }])
}



// 暴露变量
defineExpose({
    loadMsgManage,
    clearMsg
});

</script>

<style scoped>
.msg-list {
    margin-top: 46px;
    height: calc(100vh - 46px);
    overflow-y: auto;
    padding: 10px 0;
    background-color: #fff;
}

/* 聊天消息项 */
.msg-list .contact-item {
    padding: 10px;
    height: 90px;
    border-bottom: 1px solid #eee;
    clear: both;
}

/* 头像 */
.msg-list .contact-item .van-image {
    margin-right: 10px;
    display: block;
    float: left;
}

/* 用户详情 */
.msg-list .contact-item .user-details {
    flex-grow: 1;
    width: calc(100vw - 195px);
    float: left;
}

/* 用户名 */
.msg-list .contact-item .user-details .user-name {
    font-weight: bold;
    margin-bottom: 5px;
}

/* 用户状态 */
.msg-list .contact-item .user-details .status {
    font-size: 14px;
    color: #666;
    width: calc(100vw - 170px);
    height: 50px;
    overflow: hidden;
}

/* 操作按钮 */
.msg-list .contact-item .user-operate {
    margin-top: 15px;
}

/* 操作按钮中的按钮 */
.msg-list .contact-item .user-operate .operate {
    display: flex;
    justify-content: flex-end;
    font-size: 0.8rem;
    align-items: center;
    text-align: center;
    margin-left: 5px;
}

.msg-list .contact-item .user-operate .operate .van-button+.van-button {
    margin-left: 5px;
}

.operate-right {
    margin-right: 10px;
}

.operate-right-30 {
    margin-right: 5px;
}
</style>