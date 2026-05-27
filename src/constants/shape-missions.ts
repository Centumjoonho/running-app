import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type ShapeMission = {
  id: string;
  title: string;
  description: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
};

export const SHAPE_MISSIONS: ShapeMission[] = [
  {
    id: 'heart',
    title: '하트 모양 경로 만들기',
    description: '사랑을 담은 하트 Shape를 그려보세요',
    icon: 'favorite',
  },
  {
    id: 'dog',
    title: '강아지 모양 경로 만들기',
    description: '귀여운 강아지 실루엣을 완성해보세요',
    icon: 'pets',
  },
  {
    id: 'star',
    title: '별 모양 경로 만들기',
    description: '밤하늘처럼 빛나는 별 Shape에 도전하세요',
    icon: 'star',
  },
  {
    id: 'random-loop',
    title: '오늘의 랜덤 루프 만들기',
    description: '오늘만의 특별한 루프 Shape를 만들어보세요',
    icon: 'loop',
  },
];

export function getShapeMissionById(id: string): ShapeMission | undefined {
  return SHAPE_MISSIONS.find((mission) => mission.id === id);
}
