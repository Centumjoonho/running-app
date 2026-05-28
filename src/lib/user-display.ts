import type { User } from '@supabase/supabase-js';

type UserLike = Pick<User, 'email' | 'user_metadata' | 'app_metadata'> | null | undefined;

/** 로그인 계정 표시 — email이 없어도 Kakao/소셜 사용자 이름 표시 */
export function getUserDisplayLabel(user: UserLike): string {
  if (!user) {
    return '';
  }

  if (user.email) {
    return user.email;
  }

  const metadata = user.user_metadata ?? {};

  const nickname = metadata.nickname;
  if (typeof nickname === 'string' && nickname.trim()) {
    return nickname.trim();
  }

  const name = metadata.name ?? metadata.full_name ?? metadata.preferred_username ?? metadata.user_name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }

  const provider =
    (typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : null) ??
    (typeof metadata.provider === 'string' ? metadata.provider : null);

  if (provider === 'kakao') {
    return '카카오 계정 사용자';
  }

  if (provider) {
    return `${provider} 계정 사용자`;
  }

  return '카카오 계정 사용자';
}

export function getUserAccountSubtitle(user: UserLike): string | null {
  if (!user?.email) {
    return '이메일 미연동 계정';
  }

  return null;
}
