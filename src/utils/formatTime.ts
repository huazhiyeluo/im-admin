import { format } from 'date-fns';
export function formatTime(timestamp: number, formatString: string){
    const date = new Date(timestamp*1000);
    return format(date, formatString);
}

export function formatSeconds(seconds: number|string): string {
    if (typeof seconds !== 'number') {
        seconds = parseInt(seconds)
    }
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const formattedDays = days > 0 ? `${days}天 ` : '';
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;

    return `${formattedDays}${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}
