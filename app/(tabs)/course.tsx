import { Redirect } from 'expo-router';

/** @deprecated 그림 도형 코스 기능은 비활성화되었습니다. 추천 코스는 러닝 탭에서 이용하세요. */
export default function CourseScreen() {
  return <Redirect href="/(tabs)/run" />;
}
