export enum UserRole {
  ADMIN = 'admin',
  KANTIN = 'kantin',
  SISWA = 'siswa',
  GURU = 'guru',
}

export interface User {
  id?: number;
  username?: string;
  nama: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface ProfileResponse<T = User> {
  success: boolean;
  data: T;
}
