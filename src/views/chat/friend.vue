<template>
  <div class="contact-list">
    <div class="contact-item" v-if="state.friends.length > 0" v-for="item in state.friends" @click="goChat(item.Uid)">
      <van-image width="50" height="50" round :src="item.Avatar" />
      <div class="user-details">
        <div class="user-name">{{ item.Username }}[{{ item.Uid }}]</div>
        <div :class="item.IsOnline ? 'status online' : 'status offline'"></div>
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
import type { UserInfo, FriendData } from '@/utils/schema';

const props = defineProps(['db'])
const emit = defineEmits(['update-parameter'])

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
      for (const friend of state.friends) {
        saveUser(props.db, friend)
      }
    }
  });
};

//用户状态
const loadUserStatus = (data: any) => {
  if (data.ToId == state.selftUserInfo.Uid) {
    for (const key in state.friends) {
      if (state.friends[key].Uid == data.FromId) {
        if (data.MsgMedia == 11) {
          state.friends[key].IsOnline = true
        } else if (data.MsgMedia == 12) {
          state.friends[key].IsOnline = false
        }
        saveUser(props.db, state.friends[key])
      }
    }
  }
}

const loadUserManage = (data: any) => {
    const res = JSON.parse(data.Content.Data);
    if (res.user){
        if (data.MsgMedia == 24){
          state.friends = state.friends.filter(obj => obj.Uid !== res.user.Uid);
        }else{
          const isObjectInArray = state.friends.some(obj => obj.Uid === res.user.Uid);
          if(isObjectInArray){
            for (const key in state.friends){
              if (state.friends[key].Uid == res.user.Uid){
                  state.friends[key] = res.user
                  break;
              }
            }
          }else{
              state.friends.unshift(res.user);
          }
          saveUser(props.db, res.user)
        }
    }
}

const goChat = async (toId: number) => {
  emit("update-parameter", 1, toId)
}

// 暴露变量
defineExpose({
  loadUserStatus,
  loadUserManage
});

</script>


<style scoped>
.contact-list {
  margin-top: 46px;
  height: calc(100vh - 96px);
  overflow-y: auto;
  padding: 10px;
  background-color: #fff;
}

.contact-list .contact-item {
  display: flex;
  align-items: center;
  line-height: 40px;
  padding: 10px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.contact-list .contact-item:hover {
  background-color: #f5f5f5;
}

.contact-list .contact-item .user-details {
  padding-left: 15px;
}

.contact-list .contact-item .user-details .user-name {
  font-weight: bold;
}

.contact-list .contact-item .user-details .status {
  font-size: 14px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.contact-list .contact-item .user-details .online {
  background-color: #4CAF50;
}

.contact-list .contact-item .user-details .offline {
  background-color: #ccc;
}
</style>
