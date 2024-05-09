import type { FriendData, GroupData, MsgData, ApplyData } from './schema';
import { getItemById, updateItem, addItem, deleteByMultipleIndexes } from './indexedDB';
import { deleteItem, type MyDatabase } from './indexedDB';

export async function saveUser(db: MyDatabase, data: any) {
    if (!data.operateTime) {
        data.operateTime = 0
    }
    if (!data.tips) {
        data.tips = 0
    }
    if (!data.msgMedia) {
        data.msgMedia = 1
    }
    if (!data.content) {
        data.content = { "data": "", "name": "", "url": "" }
    }
    const temp = await getItemById(db, "users", data.uid)
    if (temp) {
        await updateItem(db, "users", data.uid, { uid: data.uid, username: data.username, avatar: data.avatar, isOnline: data.isOnline, operateTime: data.operateTime, tips: data.tips, msgMedia: data.msgMedia, content: { "data": data.content.data, "name": data.content.name, "url": data.content.url } });
    } else {
        await addItem(db, "users", { uid: data.uid, username: data.username, avatar: data.avatar, isOnline: data.isOnline, operateTime: data.operateTime, tips: data.tips, msgMedia: data.msgMedia, content: { "data": data.content.data, "name": data.content.name, "url": data.content.url } });
    }
}



export async function saveGroup(db: MyDatabase, data: any) {
    if (!data.operateTime) {
        data.operateTime = 0
    }
    if (!data.tips) {
        data.tips = 0
    }
    if (!data.msgMedia) {
        data.msgMedia = 1
    }
    if (!data.content) {
        data.content = { "data": "", "name": "", "url": "" }
    }
    const temp = await getItemById(db, "groups", data.groupId)
    if (temp) {
        await updateItem(db, "groups", data.groupId, { groupId: data.groupId, ownerUid: data.ownerUid, name: data.name, icon: data.icon, info: data.info, Num: data.Num, operateTime: data.operateTime, tips: data.tips, msgMedia: data.msgMedia, content: { "data": data.content.data, "name": data.content.name, "url": data.content.url } });
    } else {
        await addItem(db, "groups", { groupId: data.groupId, ownerUid: data.ownerUid, name: data.name, icon: data.icon, info: data.info, Num: data.Num, operateTime: data.operateTime, tips: data.tips, msgMedia: data.msgMedia, content: { "data": data.content.data, "name": data.content.name, "url": data.content.url } });
    }
}

export async function delGroup(db: MyDatabase, groupId: number) {
    await deleteItem(db, "group_members", groupId)
}


export async function saveGroupUser(db: MyDatabase, groupId: number, data: any) {
    const id = `${groupId}_${data.uid}`
    const temp = await getItemById(db, "group_members", id)
    if (temp) {
        await updateItem(db, "group_members", id, { groupId: groupId, memberId: data.uid });
    } else {
        await addItem(db, "group_members", { groupId: groupId, memberId: data.uid });
    }
    saveUser(db, data)
}

export async function delGroupUser(db: MyDatabase, groupId: number, uid: number) {
    const id = `${groupId}_${uid}`
    await deleteItem(db, "group_members", id)
}

export async function delGroupAllUser(db: MyDatabase, groupId: number) {
    await deleteByMultipleIndexes(db, 'group_members', [{ indexName: "groupId", value: groupId }])
}


export async function saveApply(db: MyDatabase, data: ApplyData) {
    const temp = await getItemById(db, "apply", data.id)
    if (temp) {
        await updateItem(db, "apply", data.id, { id: data.id, fromId: data.fromId, fromName: data.fromName, fromIcon: data.fromIcon, toId: data.toId, toName: data.toName, toIcon: data.toIcon, type: data.type, status: data.status, reason: data.reason, operateTime: data.operateTime });
    } else {
        await addItem(db, "apply", { id: data.id, fromId: data.fromId, fromName: data.fromName, fromIcon: data.fromIcon, toId: data.toId, toName: data.toName, toIcon: data.toIcon, type: data.type, status: data.status, reason: data.reason, operateTime: data.operateTime });
    }
}

export async function saveMessage(db: MyDatabase, data: any) {
    if (!data.content) {
        data.content = { "data": "", "name": "", "url": "" }
    }
    if (!data.content.data) {
        data.content.data = ""
    }
    if (!data.content.name) {
        data.content.name = ""
    }
    if (!data.content.url) {
        data.content.url = ""
    }
    await addItem(db, "message", {fromId: data.fromId, toId: data.toId, avatar: data.avatar, msgType: data.msgType, msgMedia: data.msgMedia, content: { "data": data.content.data, "name": data.content.name, "url": data.content.url }, createTime: data.createTime })
}



export async function urlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch file from URL');
    }
    const blob = await response.blob();
    return blob;
}


export async function getImg(db: MyDatabase, url: string): Promise<string> {
    let imgUrl = url;
    const temp = await getItemById(db, "file", url);
    if (!temp) {
        const blob = await urlToBlob(url);
        await addItem(db, "file", { url: url, data: blob });
    } else {
        imgUrl = URL.createObjectURL(temp.data);
    }
    return imgUrl;
}