<template>
  <div class="contact-list">
    <div class="contact-item" v-if="state.groups.length > 0" v-for="item in state.groups" @click="goChat(item.GroupId)">
      <van-image width="50" height="50" round :src="item.Icon" />
      <div class="user-details">
        <div :class="getClass(item)">{{ item.Name }}[{{ item.Num }}]</div>
        <div class="content">{{ getContent(item) }}</div>
      </div>
      <div class="user-operate">
        <van-badge :content="item.Tips" :color="item.Tips > 0 ? 'red' : '#ccc'" :max="99" />
      </div>
    </div>
    <van-empty description="暂无群组" v-if="state.groups.length == 0" />
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { Session } from '@/utils/storage';
import { getGroupList } from '@/api/index';
import { formatSeconds } from '@/utils/formatTime';
import { delGroup, delGroupAllUser, delGroupUser, saveGroup, saveGroupUser, saveUser } from '@/utils/dbsave';
import type { UserInfo, GroupData, MsgData } from '@/utils/schema';
import { getItemById } from '@/utils/indexedDB';

const props = defineProps(['db'])
const emit = defineEmits(['update-parameter-group', 'update-parameter-group-tips'])

const state = reactive({
  selftUserInfo: {} as UserInfo,
  groups: [] as GroupData[],
  loading: false,
  finished: false,
});

onMounted(() => {
  init()
});

const init = () => {
  state.selftUserInfo = Session.get('userInfo')
  getList()
};

const getClass = (item: GroupData) => {
  const content = getContent(item);
  if (content == "") {
    return "user-name-single"
  }
  return "user-name"
}


// 初始化表格数据
const getList = async () => {
  getGroupList({ fromId: state.selftUserInfo.Uid }).then(async (response: any) => {
    if (response.data) {
      state.groups = response.data;
      let totalTips = 0
      for (const key in state.groups) {
        const temp = await getItemById(props.db, "groups", state.groups[key].GroupId)
        if (temp) {
          state.groups[key].OperateTime = temp.OperateTime
          state.groups[key].Tips = temp.Tips
          state.groups[key].MsgMedia = temp.MsgMedia
          state.groups[key].Content = temp.Content
          totalTips += temp.Tips
        } else {
          state.groups[key].OperateTime = 0
          state.groups[key].Tips = 0
          state.groups[key].MsgMedia = 1
          state.groups[key].Content = { "Data": "", "Url": "", "Name": "" }
        }
        saveGroup(props.db, state.groups[key])
      }
      state.groups.sort((a, b) => b.OperateTime - a.OperateTime);
      emit("update-parameter-group-tips", totalTips)
    }
  });
};

const loadGroupManage = (data: any) => {
  const res = JSON.parse(data.Content.Data);
  if (res.group) {
    if (data.MsgMedia == 30) {
      loadGroupManageCreate(res)
    }
    if (data.MsgMedia == 32) {
      loadGroupManageAgree(res)
    }
    if (data.MsgMedia == 34) {
      loadGroupManageQuit(res)
    }
    if (data.MsgMedia == 35) {
      loadGroupManageDisband(res)
    }
  }
}

const loadGroupManageCreate = (res: any) => {
  const existingGroupIndex = state.groups.findIndex(group => group.GroupId === res.group.GroupId);
  if (existingGroupIndex !== -1) {
      state.groups[existingGroupIndex] = res.group;
  } else {
      state.groups.unshift(res.group);
  }
  // 添加或更新群组的操作时间戳
  res.group.OperateTime = Math.floor(new Date().getTime() / 1000);
  // 保存群组信息到数据库
  saveGroup(props.db, res.group);
  if (res.user) {
      // 如果存在用户信息，则保存用户信息到数据库，并保存用户到群组的关联关系
      saveUser(props.db, res.user);
      saveGroupUser(props.db, res.group.GroupId, res.user);
  }
}

const loadGroupManageAgree = (res: any) => {
  const existingGroupIndex = state.groups.findIndex(group => group.GroupId === res.group.GroupId);
  if (existingGroupIndex !== -1) {
      state.groups[existingGroupIndex] = res.group;
  } else {
      state.groups.unshift(res.group);
  }
  // 添加或更新群组的操作时间戳
  res.group.OperateTime = Math.floor(new Date().getTime() / 1000);
  // 保存群组信息到数据库
  saveGroup(props.db, res.group);
  if (res.user) {
      // 如果存在用户信息，则保存用户信息到数据库，并保存用户到群组的关联关系
      saveUser(props.db, res.user);
      saveGroupUser(props.db, res.group.GroupId, res.user);
  }
}

const loadGroupManageQuit = (res: any) => {
  if (state.selftUserInfo.Uid === res.user.Uid) { // 自己的情况下要去掉组的消息
    delGroup(props.db, res.group.GroupId);
    state.groups = state.groups.filter(group => group.GroupId !== res.group.GroupId);
  } else {
    const existingGroupIndex = state.groups.findIndex(group => group.GroupId === res.group.GroupId);
    if (existingGroupIndex !== -1) {
      state.groups[existingGroupIndex] = res.group;
    }
  }
  delGroupUser(props.db, res.group.GroupId, res.user.Uid);
}

const loadGroupManageDisband = (res: any) => {
  delGroup(props.db, res.group.GroupId);
  state.groups = state.groups.filter(group => group.GroupId !== res.group.GroupId);
  delGroupAllUser(props.db, res.group.GroupId);
}


const loadGroupMsg = (data: MsgData, num: number = 0) => {
  if (num > 0) {
    // 播放声音
    var audio = new Audio('/src/assets/voice/2.mp3');
    audio.play();
  }
  for (const key in state.groups) {
    if (state.groups[key].GroupId == data.ToId) {
      state.groups[key].OperateTime = Math.floor(new Date().getTime() / 1000)
      state.groups[key].Tips += num
      state.groups[key].MsgMedia = data.MsgMedia
      state.groups[key].Content = data.Content
      state.groups.sort((a, b) => b.OperateTime - a.OperateTime);
      saveGroup(props.db, state.groups[key])
      break;
    }
  }

}

const getContent = (item: GroupData) => {
  switch (item.MsgMedia) {
    case 1:
      return item.Content.Data;
    case 2:
      return '[图片]';
    case 3:
      return '[音频]';
    case 4:
      return '[视频]';
    case 5:
      return '[文件]';
    case 6:
      return '[表情]';
    case 10:
    case 11:
    case 13:
      return '[语音通话]' + item.Content.Data;
    case 12:
      return '[语音通话]通话时长: ' + formatSeconds(item.Content.Data);
    default:
      return '';
  }
}

const goChat = async (toId: number) => {
  for (const key in state.groups) {
    if (state.groups[key].GroupId == toId) {
      emit("update-parameter-group-tips", -state.groups[key].Tips)
      state.groups[key].Tips = 0
      saveGroup(props.db, state.groups[key])
      break;
    }
  }
  emit("update-parameter-group", 2, toId)
}

// 暴露变量
defineExpose({
  loadGroupManage,
  loadGroupMsg
});

</script>


<style scoped>
.contact-list {
  margin-top: 46px;
  height: calc(100vh - 96px);
  overflow-y: auto;
  padding: 5px 0;
  background-color: #fff;
}

.contact-list .contact-item {
  line-height: 35px;
  padding: 0 10px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: block;
  height: 70px;
  clear: both;
  border-bottom: 1px solid #eee;
  overflow: hidden;
}

.contact-list .contact-item .van-image {
  margin-right: 10px;
  margin-top: 5px;
  display: block;
  float: left;
}

.contact-list .contact-item:hover {
  background-color: #f5f5f5;
}

.contact-list .contact-item .user-details {
  flex-grow: 1;
  max-width: calc(100vw - 130px);
  float: left;
}

.contact-list .contact-item .user-details .user-name {
  font-weight: bold;
  line-height: 30px;
}

.contact-list .contact-item .user-details .user-name-single {
  font-weight: bold;
  line-height: 60px;
}

.contact-list .contact-item .user-details .content {
  white-space: nowrap;
  /* 防止文本换行 */
  overflow: hidden;
  /* 隐藏溢出的文本 */
  text-overflow: ellipsis;
  /* 使用省略号表示溢出的文本 */
}

.user-operate {
  float: right;
  margin-top: 15px;
  margin-right: 10px;
}
</style>