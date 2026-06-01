# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Supabase Edge Functions

현재 사용 중인 함수:

- `generate-running-route` — 현재 위치 기준 추천 루프 러닝 코스 생성 (Mapbox walking)

배포:

```bash
supabase functions deploy generate-running-route --no-verify-jwt
```

### 제거된 함수 (도형 코스)

`generate-shape-route` (heart / star / letterM 도형 코스)는 **현재 제거**되었습니다.
앱은 **추천 러닝 코스**(`generate-running-route`)만 사용합니다.

추후 도형 코스 기능을 다시 만들 때:

```bash
supabase functions new generate-shape-route
```

`MAPBOX_ACCESS_TOKEN` secret은 `generate-running-route`에서 계속 사용합니다.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
