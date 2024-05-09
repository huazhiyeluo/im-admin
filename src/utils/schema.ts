export interface UserInfo {
    uid: number;
    username: string;
    avatar: string;
    info: string;
    email: string;
    phone: string;
}

export interface FriendData {
    uid: number;
    username: string;
    avatar: string;
    isOnline: boolean;
    operateTime:number;
    tips:number;
    msgMedia: number;
    content: ChildContent;
}

export interface GroupData {
    groupId: number;
    ownerUid: number;
    name: string;
    icon: string;
    info: string;
    num: boolean;
    operateTime:number;
    tips:number;
    msgMedia: number;
    content: ChildContent;
}

export interface ChildContent {
    data: string,
    name: string;
    url: string;
}


export interface MsgData {
    fromId: number;
    toId: number;
    msgMedia: number;
    msgType: number;
    content: ChildContent;
    avatar: string;
    createTime: number;
}

export interface ApplyData {
    id: number;
    fromId: number;
    fromName: string;
    fromIcon: string;
    toId: number;
    toName: string;
    toIcon: string;
    type: number;
    reason: string;
    status: number;
    operateTime:number;
}

export interface Emojs {
    url: string;
    newurl: string;
}