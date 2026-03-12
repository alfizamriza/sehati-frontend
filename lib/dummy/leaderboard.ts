export type LeaderboardItem = {
    id: number;
    nama: string;
    kelas: string;
    coins: number;
    streak: number; // hari
    avatar?: string; // emoji (optional)
};

export const leaderboardDummy: LeaderboardItem[] = [
    { id: 1, nama: "Alfi Zamriza", kelas: "XII RPL 1", coins: 380, streak: 25, avatar: "👑" },
    { id: 2, nama: "Siti Aminah", kelas: "XII RPL 1", coins: 350, streak: 22, avatar: "🥈" },
    { id: 3, nama: "Budi Santoso", kelas: "XII TKJ 2", coins: 320, streak: 20, avatar: "🥉" },
    { id: 4, nama: "Dewi Putri", kelas: "XI RPL 2", coins: 300, streak: 18, avatar: "👧" },
    { id: 5, nama: "Andi Wijaya", kelas: "XI TKJ 1", coins: 285, streak: 16, avatar: "👦" },
    { id: 6, nama: "Rina Sari", kelas: "XII RPL 2", coins: 270, streak: 15, avatar: "👧" },
    { id: 7, nama: "Rudi Hartono", kelas: "XI RPL 1", coins: 260, streak: 14, avatar: "👦" },
    { id: 8, nama: "Maya Kusuma", kelas: "X TKJ 2", coins: 245, streak: 13, avatar: "👧" },
    { id: 9, nama: "Hendra Gunawan", kelas: "X RPL 1", coins: 230, streak: 12, avatar: "👦" },
    { id: 10, nama: "Lisa Amelia", kelas: "XII TKJ 1", coins: 220, streak: 11, avatar: "👧" },
];
