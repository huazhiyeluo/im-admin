<template>
    <van-nav-bar :title="state.title" />
    <van-form v-if="state.isShowLogin" class="im-form">
        <van-cell-group inset>
            <van-field v-model="state.loginForm.username" name="用户名" label="" placeholder="用户名" :rules="[{ required: true, message: '请填写用户名' }]" />
            <van-field v-model="state.loginForm.password" type="password" name="密码" autocomplete="off" label="" placeholder="密码" :rules="[{ required: true, message: '请填写密码' }]" />
        </van-cell-group>
        <div style="margin: 16px;">
            <van-button round block type="danger" size="small" native-type="submit" @click="doLogin">
                登录
            </van-button>
            <div class="to-button">
                <span type="primary" size="small" plain @click="toRegister">注册账号</span> 
                | 
                <span type="primary" size="small" plain @click="toRegister">忘记密码</span>
            </div>
        </div>
    </van-form>
    <van-form v-if="!state.isShowLogin" class="im-form">
        <van-cell-group inset>
            <van-field v-model="state.registerForm.username" name="用户名" label="" placeholder="用户名" :rules="[{ required: true, message: '请填写用户名' }]" />
            <van-field v-model="state.registerForm.password" type="password" name="密码" autocomplete="off" label="" placeholder="密码" :rules="[{ required: true, message: '请填写密码' }]" />
            <van-field v-model="state.registerForm.repassword" type="password" name="确认密码" autocomplete="off" label="" placeholder="确认密码" :rules="[{ required: true, message: '请填写确认密码' }]" />
        </van-cell-group>
        <div style="margin: 16px;">
            <van-button round block type="danger" size="small" native-type="submit" @click="doRegister">
                注册
            </van-button>
            <div class="to-button">
                <span type="primary" size="small" plain @click="toLogin">登录账号</span> 
                | 
                <span type="primary" size="small" plain @click="toRegister">忘记密码</span>
            </div>
        </div>
    </van-form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast } from 'vant';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '@/utils/storage';


import { register, login } from '@/api/index';
const router = useRouter();

const state = reactive({
    isShowLogin: true,
    title: "登录",
    loginForm: {
        "username": "",
        "password": "",
    },
    registerForm: {
        "username": "",
        "password": "",
        "repassword": "",
    }
});
const doLogin = () => {
    login(state.loginForm).then((response: any) => {
        if (response.code == 0) {
            Session.set('userInfo', response.data)
            Session.set('token', response.token)
            Session.set('sessionKey', uuidv4())

            showSuccessToast('登录成功');
            router.push('/');
        } else {
            showFailToast(response.msg);
        }
    });
}

const doRegister = () => {
    register(state.registerForm).then((response: any) => {
        if (response.code == 0) {
            showSuccessToast('注册成功');
            toLogin()
        } else {
            showFailToast(response.msg);
        }
    });
}

const toRegister = () => {
    // 发送消息 
    state.isShowLogin = false
    state.title = "注册"
}
const toLogin = () => {
    // 发送消息 
    state.isShowLogin = true
    state.title = "登录"
}
</script>

<style scoped>
.im-form {
    margin-top: 20px;
}

.to-button {
    width: 100%;
    margin-top: 10px;
    text-align: center;
}

.to-button span{
    color:#4c90ff;
}
</style>
