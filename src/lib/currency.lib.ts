export function formatCurrency(num: number) {
    if (num === null || num === undefined) return "";

    const absNum = Math.abs(num);

    if (absNum >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(2) + "T";
    if (absNum >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
    if (absNum >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (absNum >= 1_000) return (num / 1_000).toFixed(2) + "K";

    return num.toString();
}

export function formatWithCommas(num: number) {
    return num.toLocaleString('en-US');
}