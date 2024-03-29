//字符串转数组
export function convertToArray(val: string) {
    return [val]
}

/**
 * 数组、数组对象 在其中
 * @param arr 数组内容
 * @param attr 需要去重的键值（数组对象）
 * @returns
 */
export function inArray( attr: string|number, arr: unknown[] | string[] | number[]):boolean {
	if (!Object.keys(arr).length) {
		return false;
	} else {
		let flag = false
        arr.map((val: any) => {
            if (val == attr) {
				flag = true
            }
        });
		return flag
	}
}
