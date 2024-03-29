<template>
    <van-form class="person-user">
        <van-cell-group inset>
            <van-field name="uploader" label="头像">
                <template #input>
                    <van-uploader  accept="image/*" v-model="state.fileList" reupload max-count="1" :after-read="handleSuccessImage"/>
                </template>
            </van-field>
            <van-field v-model="state.personInfo.username" name="用户名" label="用户名" placeholder="用户名"
                :rules="[{ required: true, message: '请填写用户名' }]" />
            <van-field v-model="state.personInfo.info" type="textarea" name="描述" label="描述" placeholder="描述"
                :rules="[{ required: true, message: '请填写描述' }]" />
        </van-cell-group>
        <div style="margin: 16px;">
            <van-button round block type="primary" size="small" native-type="submit" @click="doPersonInfo">
                确认
            </van-button>
        </div>
    </van-form>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { showSuccessToast, showFailToast } from 'vant';
import { Session } from '@/utils/storage';
import type { UserInfo } from '@/utils/schema';

import { upload,editUser } from '@/api/index';

const emit = defineEmits(['update-parameter'])

const state = reactive({
    selftUserInfo: {} as UserInfo,
    personInfo: {
        uid: 0,
        username: "",
        avatar: "",
        info: "",
    },
    fileList:[]
});


onMounted(() => {
    init()
});
const init = () => {
    state.selftUserInfo = Session.get('userInfo')
};


const handleSuccessImage = (file:any) => {
    const formData = new FormData()
    formData.append('file',file.file)
    upload(formData).then((response: any) => {
        state.personInfo.avatar = response.data
    });
}

const doPersonInfo = () => {
    let updateData = JSON.parse(JSON.stringify(state.personInfo));
    updateData.uid = state.selftUserInfo.Uid
    editUser(updateData).then((response: any) => {
        if (response.code == 0) {
            showSuccessToast('保存成功');
            state.selftUserInfo.Avatar = response.data.Avatar;
            state.selftUserInfo.Username = response.data.Username;
            state.selftUserInfo.Info = response.data.Info;
            Session.set('userInfo', state.selftUserInfo)
            state.personInfo = {
                uid: 0,
                username: "",
                avatar: "",
                info: "",
            }
            emit("update-parameter")
        } else {
            showFailToast(response.msg);
        }
    });
}

</script>

<style scoped>
.person-user {
    margin-top: 46px;
    height: calc(100vh - 46px);
    overflow-y: auto;
    padding: 10px;
    background-color: #fff;
}


</style>