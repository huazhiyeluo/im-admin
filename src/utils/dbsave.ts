import type { FriendData, GroupData, ApplyData } from './schema';
import { getItemById, updateItem, addItem } from './indexedDB';
import { deleteItem, type MyDatabase } from './indexedDB';

export async function saveUser(db: MyDatabase, data: FriendData) {
    const temp = await getItemById(db, "users", data.Uid)
    if (temp) {
        await updateItem(db, "users", data.Uid, { Uid: data.Uid, Username: data.Username, Avatar: data.Avatar, IsOnline: data.IsOnline });
    } else {
        await addItem(db, "users", { Uid: data.Uid, Username: data.Username, Avatar: data.Avatar, IsOnline: data.IsOnline });
    }
}


export async function saveGroup(db: MyDatabase, data: GroupData) {
    const temp = await getItemById(db, "groups", data.GroupId)
    if (temp) {
        await updateItem(db, "groups", data.GroupId, { GroupId: data.GroupId, OwnerUid: data.OwnerUid, Name: data.Name, Icon: data.Icon, Info: data.Info, Num: data.Num });
    } else {
        await addItem(db, "groups", { GroupId: data.GroupId, OwnerUid: data.OwnerUid, Name: data.Name, Icon: data.Icon, Info: data.Info, Num: data.Num });
    }
}

export async function delGroup(db: MyDatabase, groupId: number) {
    await deleteItem(db, "group_members", groupId)
}


export async function saveGroupUser(db: MyDatabase, groupId: number, data: FriendData) {
    const id = `${groupId}_${data.Uid}`
    const temp = await getItemById(db, "group_members", id)
    console.log("saveGroupUser", temp)
    if (temp) {
        await updateItem(db, "group_members", id, { GroupId: groupId, MemberId: data.Uid });
    } else {
        await addItem(db, "group_members", { GroupId: groupId, MemberId: data.Uid });
    }
    saveUser(db, data)
}

export async function delGroupUser(db: MyDatabase, groupId: number, uid: number) {
    const id = `${groupId}_${uid}`
    await deleteItem(db, "group_members", id)
}


export async function saveApply(db: MyDatabase, data: ApplyData) {
    const temp = await getItemById(db, "apply", data.Id)
    if (temp) {
        await updateItem(db, "apply", data.Id, { Id: data.Id, FromId: data.FromId, FromName: data.FromName, FromIcon: data.FromIcon, ToId: data.ToId, ToName: data.ToName, ToIcon: data.ToIcon, Type: data.Type, Status: data.Status, Reason: data.Reason , OperateTime:data.OperateTime });
    } else {
        await addItem(db, "apply", { Id: data.Id, FromId: data.FromId, FromName: data.FromName, FromIcon: data.FromIcon, ToId: data.ToId, ToName: data.ToName, ToIcon: data.ToIcon, Type: data.Type, Status: data.Status, Reason: data.Reason, OperateTime:data.OperateTime });
    }
}