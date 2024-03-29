import axios, { } from 'axios';
import { Session } from '../utils/storage';
import { showFailToast } from 'vant';

// 配置新建一个 axios 实例
const service = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 50000,
    headers: { 'Content-Type': 'application/json' },
});


// 添加请求拦截器
service.interceptors.request.use(
    (config: any) => {
        // 在发送请求之前做些什么
        if (Session.get('token')) {
            config.headers!['Authorization'] = `${Session.get('token')}`;
        }
        return config;
    }
    , function (error) {
        // 对请求错误做些什么
        return Promise.reject(error);
    });

// 添加响应拦截器
service.interceptors.response.use(function (response: any) {
    // 2xx 范围内的状态码都会触发该函数。
    // 对响应数据做点什么
    const res = response.data;
    if (res.code && res.code !== 0) {
        // `token` 过期或者账号已在别处登录
        if (res.code === 401 || res.code === 4001) {
            Session.clear(); // 清除浏览器全部临时缓存
            window.location.href = '/'; // 去登录页
            showFailToast("You have been logged out, please log in again")
        } else {
            showFailToast(res.msg)
        }
        return Promise.reject(service.interceptors.response);
    } else {
        return response.data;
    }
}, function (error) {
    // 超出 2xx 范围的状态码都会触发该函数。
    // 对响应错误做点什么
    return Promise.reject(error);
});

// 导出 axios 实例
export default service;