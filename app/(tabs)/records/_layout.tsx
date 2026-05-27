import { Stack } from 'expo-router';

export default function RecordsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[id]"
        options={{
          title: '기록 상세',
          headerBackTitle: '뒤로',
        }}
      />
    </Stack>
  );
}
