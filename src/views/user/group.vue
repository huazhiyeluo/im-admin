<template>
    <van-form class="person-user">
        <van-cell-group inset>
            <van-field name="uploader" label="图标">
                <template #input>
                    <van-uploader accept="image/*" v-model="state.fileList" reupload max-count="1"
                        :after-read="handleSuccessImage" />
                </template>
            </van-field>
            <van-field v-model="state.showPickerText" is-link readonly name="picker" label="类型" placeholder="点击选择"
                @click="state.showPicker = true" />
            <van-field v-model="state.personInfo.name" name="名称" label="名称" placeholder="名称"
                :rules="[{ required: true, message: '请填写名称' }]" />
            <van-field v-model="state.personInfo.info" type="textarea" name="介绍" label="介绍" placeholder="介绍"
                :rules="[{ required: true, message: '请填写介绍' }]" />
        </van-cell-group>
        <div style="margin: 16px;">
            <van-button round block type="primary" size="small" native-type="submit" @click="doPersonInfo">
                确认
            </van-button>
        </div>
        <van-popup v-model:show="state.showPicker" position="bottom">
            <van-picker :columns="state.groupTypeOption" @confirm="onConfirm" @cancel="state.showPicker = false" />
        </van-popup>
    </van-form>

</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { showSuccessToast, showFailToast } from 'vant';
import { Session } from '@/utils/storage';
import type { UserInfo } from '@/utils/schema';

import { upload, editGroup } from '@/api/index';

const emit = defineEmits(['update-parameter-person-group'])

const state = reactive({
    selftUserInfo: {} as UserInfo,
    personInfo: {
        groupId: 0,
        ownerUid: 0,
        type: "",
        name: "",
        info: "",
        icon: "",
    },
    fileList: [],
    groupTypeOption: [
        {
            value: 1,
            text: '美容美发',
        },
        {
            value: 2,
            text: '教育培训',
        },
        {
            value: 3,
            text: '工艺电子',
        },
        {
            value: 4,
            text: '农林牧副',
        },
        {
            value: 5,
            text: '外语外贸',
        },
    ],
    showPicker: false,
    showPickerText: "",
});


onMounted(() => {
    init()
});
const init = () => {
    state.selftUserInfo = Session.get('userInfo')
};


const onConfirm = ({ selectedOptions }) => {
    state.showPickerText = selectedOptions[0]?.text;
    state.personInfo.type = selectedOptions[0]?.value
    state.showPicker = false;
};

const handleSuccessImage = (file: any) => {
    const formData = new FormData()
    formData.append('file', file.file)
    upload(formData).then((response: any) => {
        state.personInfo.icon = response.data
    });
}

const doPersonInfo = () => {
    let updateData = JSON.parse(JSON.stringify(state.personInfo));
    updateData.ownerUid = state.selftUserInfo.uid
    editGroup(updateData).then((response: any) => {
        if (response.code == 0) {
            showSuccessToast('创建成功');
            state.personInfo = {
                groupId: 0,
                ownerUid: 0,
                type: "",
                name: "",
                info: "",
                icon: "",
            }
            emit("update-parameter-person-group")
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