export interface UserInfo {
    Uid: number;
    Username: string;
    Avatar: string;
    Info: string;
    Email: string;
    Phone: string;
}

export interface FriendData {
    Uid: number;
    Username: string;
    Avatar: string;
    IsOnline: boolean;
}

export interface GroupData {
    GroupId: number;
    OwnerUid: number;
    Name: string;
    Icon: string;
    Info: string;
    Num: boolean;
}

export interface ChildContent {
    Data: string,
    Name: string;
    Url: string;
}


export interface MsgData {
    FromId: number;
    ToId: number;
    MsgMedia: number;
    MsgType: number;
    Content: ChildContent;
    Avatar: string;
    CreateTime: number;
}

export interface ApplyData {
    Id: number;
    FromId: number;
    FromName: string;
    FromIcon: string;
    ToId: number;
    ToName: string;
    ToIcon: string;
    Type: number;
    Reason: string;
    Status: number;
    OperateTime:number;
}