import request from '../utils/request';

//登录
export function login(params: object) {
	return request({
		url: "/user/login",
		method: "post",
		data: params,
	});
}

//注册
export function register(params: object) {
	return request({
		url: "/user/register",
		method: "post",
		data: params,
	});
}


//联系人-列表
export function getFriendList(params: object) {
	return request({
		url: "/user/getFriendList",
		method: "post",
		data: params,
	});
}

//群组-列表
export function getGroupList(params: object) {
	return request({
		url: "/user/getGroupList",
		method: "post",
		data: params,
	});
}

//群组-成员
export function getGroupUser(params: object) {
	return request({
		url: "/user/getGroupUser",
		method: "post",
		data: params,
	});
}

//申请消息
export function getApplyList(params: object) {
	return request({
		url: "/user/getApplyList",
		method: "post",
		data: params,
	});
}

//历史消息
export function chatMsg(params: object) {
	return request({
		url: "/user/chatMsg",
		method: "post",
		data: params,
	});
}

//上传
export function upload(params: object) {
	return request({
		url: "/attach/upload",
		method: "post",
		data: params,
		headers: { 'Content-Type': 'multipart/form-data' },
	});
}



//-----------------------------------------------------------------

//用户编辑
export function editUser(params: object) {
	return request({
		url: "/user/editUser",
		method: "post",
		data: params,
	});
}

//添加好友
export function addFriend(params: object) {
	return request({
		url: "/user/addFriend",
		method: "post",
		data: params,
	});
}

//删除好友
export function delFriend(params: object) {
	return request({
		url: "/user/delFriend",
		method: "post",
		data: params,
	});
}


//群编辑
export function editGroup(params: object) {
	return request({
		url: "/user/editGroup",
		method: "post",
		data: params,
	});
}
//加入群
export function joinGroup(params: object) {
	return request({
		url: "/user/joinGroup",
		method: "post",
		data: params,
	});
}

//加入群
export function quitGroup(params: object) {
	return request({
		url: "/user/quitGroup",
		method: "post",
		data: params,
	});
}

//申请消息操作
export function operateApply(params: object) {
	return request({
		url: "/user/operateApply",
		method: "post",
		data: params,
	});
}