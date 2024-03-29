<template>
    <div class="contact-list">
      <div class="contact-item" v-if="state.groups.length > 0" v-for="item in state.groups" @click="goChat(item.GroupId)">
        <van-image width="50" height="50" round :src="item.Icon" />
  
        <div class="user-details">
          <div class="user-name">{{ item.Name }}[{{ item.Num }}]</div>
        </div>
      </div>
      <van-empty description="暂无群组" v-if="state.groups.length == 0"  />
    </div>
  </template>
  
  <script setup lang="ts">
  import { reactive, onMounted } from 'vue'
  import { Session } from '@/utils/storage';
  import { getGroupList } from '@/api/index';
  import { delGroup, delGroupUser, saveGroup, saveGroupUser, saveUser } from '@/utils/dbsave';
  import type { UserInfo, GroupData } from '@/utils/schema';
  
  const props = defineProps(['db'])
  const emit = defineEmits(['update-parameter'])
  
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
  
  
  // 初始化表格数据
  const getList = async () => {
    getGroupList({ fromId: state.selftUserInfo.Uid }).then((response: any) => {
      if (response.data){
        state.groups = response.data;
        for (const group of state.groups) {
          saveGroup(props.db, group)
        }
      }  
    });
  };

  const loadUserManage = (data: any) => {
    const res = JSON.parse(data.Content.Data);
    if (res.group){
        if (data.MsgMedia == 34){
          if (state.selftUserInfo.Uid == res.user.Uid){ //自己的情况下要去掉组的消息
            delGroup(props.db, res.group.GroupId)
            state.groups = state.groups.filter(obj => obj.GroupId !== res.group.GroupId);
          }else{
            const isObjectInArray = state.groups.some(obj => obj.GroupId === res.group.GroupId);
            if(isObjectInArray){
              for (const key in state.groups){
                if (state.groups[key].GroupId == res.group.GroupId){
                    state.groups[key] = res.group
                    break;
                }
              }
            }
          }
          delGroupUser(props.db, res.group.GroupId , res.user.Uid)
        }else{
          const isObjectInArray = state.groups.some(obj => obj.GroupId === res.group.GroupId);
          if(isObjectInArray){
            for (const key in state.groups){
              if (state.groups[key].GroupId == res.group.GroupId){
                  state.groups[key] = res.group
                  break;
              }
            }
          }else{
              state.groups.unshift(res.group);
          }
          saveGroup(props.db, res.group)
          if (res.user){
            saveUser(props.db, res.user)
            saveGroupUser(props.db,res.group.GroupId, res.user)
          }
        }
    }

    
}
  
  const goChat = async (toId: number) => {
    emit("update-parameter", 2, toId)
  }

  // 暴露变量
defineExpose({
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
  