<template>
  <div class="contact-list">
    <div class="contact-item" v-if="state.friends.length > 0" v-for="item in state.friends" @click="goChat(item.uid)">
      <van-image width="50" height="50" round :src="item.avatar" />
      <div class="user-details">
        <div class="user-name">{{ item.username }}[{{ item.uid }}]</div>
        <div class="content"><span :class="item.isOnline ? 'status online' : 'status offline'"></span>{{
      getcontent(item) }}</div>
      </div>
      <div class="user-operate">
        <van-badge :content="item.tips" :color="item.tips > 0 ? 'red' : '#ccc'" :max="99" />
      </div>
    </div>
    <van-empty description="暂无好友" v-if="state.friends.length == 0" />
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { Session } from '@/utils/storage';
import { getFriendList } from '@/api/index';
import { getImg, saveUser } from '@/utils/dbsave';
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
  getFriendList({ fromId: state.selftUserInfo.uid }).then(async (response: any) => {
    if (response.data) {
      state.friends = response.data;
      let totaltips = 0
      for (const key in state.friends) {
        const temp = await getItemById(props.db, "users", state.friends[key].uid)
        if (temp) {
          state.friends[key].operateTime = temp.operateTime
          state.friends[key].tips = temp.tips
          state.friends[key].msgMedia = temp.msgMedia
          state.friends[key].content = temp.content
          totaltips += temp.tips
        } else {
          state.friends[key].operateTime = 0
          state.friends[key].tips = 0
          state.friends[key].msgMedia = 1
          state.friends[key].content = { "data": "", "Url": "", "Name": "" }
        }
        saveUser(props.db, state.friends[key])
        state.friends[key].avatar = await getImg(props.db, state.friends[key].avatar)
      }
      state.friends.sort((a, b) => b.operateTime - a.operateTime);

      emit("update-parameter-friend-tips", totaltips)
    }
  });
};



//用户状态
const loadFriendStatus = async (data: any) => {
  if (data.toId === state.selftUserInfo.uid) {
    const friend = state.friends.find(friend => friend.uid === data.fromId);
    if (friend) {
      if (data.msgMedia === 11) {
        friend.isOnline = true;
        // 播放声音
        const audio = new Audio('/src/assets/voice/1.mp3');
        audio.play();
      } else if (data.msgMedia === 12) {
        friend.isOnline = false;
      }

      const temp = await getItemById(props.db, "users", data.fromId)
      if (temp){
        temp.isOnline = friend.isOnline
      }
      saveUser(props.db, temp);
    }
  }
}

//用户信息
const loadFriendInfo = async (data: any) => {
  const res = JSON.parse(data.content.data);
  if (res.user.uid !== state.selftUserInfo.uid) { 
    const existingIndex = state.friends.findIndex(obj => obj.uid === res.user.uid);

    const temp = await getItemById(props.db, "users", res.user.uid)
    if (temp) {
      res.user.operateTime = temp.operateTime
      res.user.tips = temp.tips
      res.user.msgMedia = temp.msgMedia
      res.user.content = temp.content
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
  const res = JSON.parse(data.content.data);
  if (res.user) {
    if (data.msgMedia == 22) {
      loadFriendManageAgree(res)
    }
    if (data.msgMedia == 24) {
      loadFriendManageDelete(res)
    }
  }
}



const loadFriendManageAgree = (res: any) => {
  const existingIndex = state.friends.findIndex(obj => obj.uid === res.user.uid);
  if (existingIndex !== -1) {
    state.friends[existingIndex] = res.user;
  } else {
    state.friends.unshift(res.user);
  }
  res.user.operateTime = Math.floor(new Date().getTime() / 1000);
  saveUser(props.db, res.user);
}

const loadFriendManageDelete = (res: any) => {
  state.friends = state.friends.filter(obj => obj.uid !== res.user.uid);
}



const loadFriendMsg = async (data: MsgData, num: number = 0) => {
  if (num > 0) {
    // 播放声音
    var audio = new Audio('/src/assets/voice/3.mp3');
    audio.play();
  }
  for (const key in state.friends) {
    if (state.friends[key].uid == data.fromId || state.friends[key].uid == data.toId) {
      state.friends[key].operateTime = Math.floor(new Date().getTime() / 1000)
      state.friends[key].tips += num
      state.friends[key].msgMedia = data.msgMedia
      state.friends[key].content = data.content
      state.friends.sort((a, b) => b.operateTime - a.operateTime);

      const newData = JSON.parse(JSON.stringify(state.friends[key]));
      const temp = await getItemById(props.db, "users", state.friends[key].uid)
      if (temp){
        newData.icon = temp.icon
      }
      saveUser(props.db, newData)
      break;
    }
  }

}


const getcontent = (item: FriendData) => {
  switch (item.msgMedia) {
    case 1:
      return item.content.data;
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
      return '[语音通话]' + item.content.data;
    case 12:
      return '[语音通话]通话时长: ' + formatSeconds(item.content.data);
    default:
      return '';
  }
}


const goChat = async (toId: number) => {
  for (const key in state.friends) {
    if (state.friends[key].uid == toId) {
      emit("update-parameter-friend-tips", -state.friends[key].tips)
      if (state.friends[key].tips > 0) {
        state.friends[key].tips = 0
        const temp = await getItemById(props.db, "users", state.friends[key].uid)
        if (temp){
          temp.tips = 0
          saveUser(props.db, temp)
        }
      }
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
