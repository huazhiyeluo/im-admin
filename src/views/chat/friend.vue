<template>
  <div class="contact-list">
    <div class="contact-item" v-if="state.friends.length > 0" v-for="item in state.friends" @click="goChat(item.Uid)">
      <van-image width="50" height="50" round :src="item.Avatar" />
      <div class="user-details">
        <div class="user-name">{{ item.Username }}[{{ item.Uid }}]</div>
        <div class="content"><span :class="item.IsOnline ? 'status online' : 'status offline'"></span>{{
      getContent(item) }}</div>
      </div>
      <div class="user-operate">
        <van-badge :content="item.Tips" :color="item.Tips > 0 ? 'red' : '#ccc'" :max="99" />
      </div>
    </div>
    <van-empty description="暂无好友" v-if="state.friends.length == 0" />
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { Session } from '@/utils/storage';
import { getFriendList } from '@/api/index';
import { saveUser } from '@/utils/dbsave';
import { formatSeconds } from '@/utils/formatTime';
import type { UserInfo, FriendData, MsgData } from '@/utils/schema';
import { getItemById } from '@/utils/indexedDB';

const props = defineProps(['db'])
const emit = defineEmits(['update-parameter-friend', 'update-parameter-friend-tips'])

const state = reactive({
  selftUserInfo: {} as UserInfo,
  friends: [] as FriendData[],
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


// 初始化表格数据
const getList = async () => {
  getFriendList({ fromId: state.selftUserInfo.Uid }).then(async (response: any) => {
    if (response.data) {
      state.friends = response.data;
      let totalTips = 0
      for (const key in state.friends) {
        const temp = await getItemById(props.db, "users", state.friends[key].Uid)
        if (temp) {
          state.friends[key].OperateTime = temp.OperateTime
          state.friends[key].Tips = temp.Tips
          state.friends[key].MsgMedia = temp.MsgMedia
          state.friends[key].Content = temp.Content
          totalTips += temp.Tips
        } else {
          state.friends[key].OperateTime = 0
          state.friends[key].Tips = 0
          state.friends[key].MsgMedia = 1
          state.friends[key].Content = { "Data": "", "Url": "", "Name": "" }
        }
        saveUser(props.db, state.friends[key])
      }
      state.friends.sort((a, b) => b.OperateTime - a.OperateTime);

      emit("update-parameter-friend-tips", totalTips)
    }
  });
};

//用户状态
const loadFriendStatus = (data: any) => {
  if (data.ToId === state.selftUserInfo.Uid) {
    const friend = state.friends.find(friend => friend.Uid === data.FromId);
    if (friend) {
      if (data.MsgMedia === 11) {
        friend.IsOnline = true;
        // 播放声音
        const audio = new Audio('/src/assets/voice/1.mp3');
        audio.play();
      } else if (data.MsgMedia === 12) {
        friend.IsOnline = false;
      }
      saveUser(props.db, friend);
    }
  }
}

//用户信息
const loadFriendInfo = async (data: any) => {
  const res = JSON.parse(data.Content.Data);
  if (res.user.Uid !== state.selftUserInfo.Uid) { 
    const existingIndex = state.friends.findIndex(obj => obj.Uid === res.user.Uid);

    const temp = await getItemById(props.db, "users", res.user.Uid)
    if (temp) {
      res.user.OperateTime = temp.OperateTime
      res.user.Tips = temp.Tips
      res.user.MsgMedia = temp.MsgMedia
      res.user.Content = temp.Content
    }

    if (existingIndex !== -1) {
      state.friends[existingIndex] = res.user;
    } else {
      state.friends.unshift(res.user);
    }
  }
  saveUser(props.db, res.user);
}

const loadFriendManage = (data: any) => {
  const res = JSON.parse(data.Content.Data);
  if (res.user) {
    if (data.MsgMedia == 22) {
      loadFriendManageAgree(res)
    }
    if (data.MsgMedia == 24) {
      loadFriendManageDelete(res)
    }
  }
}



const loadFriendManageAgree = (res: any) => {
  const existingIndex = state.friends.findIndex(obj => obj.Uid === res.user.Uid);
  if (existingIndex !== -1) {
    state.friends[existingIndex] = res.user;
  } else {
    state.friends.unshift(res.user);
  }
  res.user.OperateTime = Math.floor(new Date().getTime() / 1000);
  saveUser(props.db, res.user);
}

const loadFriendManageDelete = (res: any) => {
  state.friends = state.friends.filter(obj => obj.Uid !== res.user.Uid);
}



const loadFriendMsg = (data: MsgData, num: number = 0) => {
  if (num > 0) {
    // 播放声音
    var audio = new Audio('/src/assets/voice/3.mp3');
    audio.play();
  }
  for (const key in state.friends) {
    if (state.friends[key].Uid == data.FromId || state.friends[key].Uid == data.ToId) {
      state.friends[key].OperateTime = Math.floor(new Date().getTime() / 1000)
      state.friends[key].Tips += num
      state.friends[key].MsgMedia = data.MsgMedia
      state.friends[key].Content = data.Content
      state.friends.sort((a, b) => b.OperateTime - a.OperateTime);
      console.log(state.friends)
      saveUser(props.db, state.friends[key])
      break;
    }
  }

}


const getContent = (item: FriendData) => {
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
  for (const key in state.friends) {
    if (state.friends[key].Uid == toId) {
      emit("update-parameter-friend-tips", -state.friends[key].Tips)
      state.friends[key].Tips = 0
      saveUser(props.db, state.friends[key])
      break;
    }
  }
  emit("update-parameter-friend", 1, toId)
}

// 暴露变量
defineExpose({
  loadFriendStatus,
  loadFriendInfo,
  loadFriendManage,
  loadFriendMsg
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

.contact-list .contact-item .user-details .content {
  white-space: nowrap;
  /* 防止文本换行 */
  overflow: hidden;
  /* 隐藏溢出的文本 */
  text-overflow: ellipsis;
  /* 使用省略号表示溢出的文本 */
}

.contact-list .contact-item .user-details .status {
  display: inline-block;
  font-size: 14px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 5px;
}

.contact-list .contact-item .user-details .online {
  background-color: #4CAF50;
}

.contact-list .contact-item .user-details .offline {
  background-color: #ccc;
}

.user-operate {
  float: right;
  margin-top: 15px;
  margin-right: 10px;
}
</style>
