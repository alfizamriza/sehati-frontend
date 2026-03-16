export function toRoman(n: number): string {
    const map: [number, string][] = [
        [10, "X"], [9, "IX"], [8, "VIII"], [7, "VII"],
        [6, "VI"], [5, "V"], [4, "IV"], [3, "III"],
        [2, "II"], [1, "I"],
    ];
    let result = "";
    for (const [val, sym] of map) {
        while (n >= val) { result += sym; n -= val; }
    }
    return result;
}

export function formatKelasLabel(k: { jenjang?: string | null; tingkat: number; nama: string }): string {
    const parts: string[] = [];
    if (k.jenjang) parts.push(k.jenjang);
    parts.push(toRoman(k.tingkat));
    parts.push(k.nama);
    return parts.join(" ");
}