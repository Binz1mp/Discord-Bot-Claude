# DiscordBot-Claude

이 프로젝트는 Claude API를 사용하여 사용자 질문에 답변하는 Discord 봇을 구현합니다. 이 봇은 특정 사용자만 사용할 수 있도록 제한되어 있습니다.

## 파일 구조

```
DiscordBot-Claude/
│
├── index.js          # 메인 봇 로직
├── .env              # 환경 변수 설정 파일
├── package.json      # 프로젝트 메타데이터 및 의존성 정보
├── package-lock.json # 의존성 버전 고정 파일
└── README.md         # 프로젝트 설명 (현재 파일)
```

## 파일 설명

1. `index.js`
   - 봇의 주요 로직이 구현된 파일입니다.
   - Discord 이벤트 리스너, Claude API 호출 함수, 메시지 처리 로직 등이 포함되어 있습니다.

2. `.env`
   - 환경 변수를 설정하는 파일입니다.
   - Claude API 키, Discord 봇 토큰, 허용된 사용자 ID 목록, 허용된 서버 ID 등을 저장합니다.
   - 이 파일은 보안상 중요하므로 .gitignore에 추가하여 저장소에 커밋되지 않도록 해야 합니다.

3. `package.json`
   - 프로젝트의 메타데이터와 의존성 정보를 담고 있는 파일입니다.
   - 필요한 npm 패키지들이 나열되어 있습니다.

4. `package-lock.json`
   - npm에 의해 자동으로 생성되는 파일로, 의존성 트리의 정확한 버전을 고정합니다.
   - 프로젝트의 재현성을 보장하는 데 중요합니다.

5. `README.md`
   - 현재 보고 계신 이 파일입니다.
   - 프로젝트의 개요, 설정 방법, 사용법 등을 설명합니다.

## 설정 방법

1. 저장소 복제:
   ```
   git clone https://github.com/your-username/DiscordBot-Claude.git
   cd DiscordBot-Claude
   ```

2. 필요한 패키지 설치:
   ```
   npm install
   ```

3. `.env` 파일 설정:
   - `.env` 파일을 생성하고 필요한 환경 변수를 설정합니다.
   - 예시:
     ```
     CLAUDE_API_KEY=your_claude_api_key_here
     DISCORD_BOT_TOKEN=your_discord_bot_token_here
     ALLOWED_USER_IDS=123456789,987654321
     ALLOWED_SERVER_ID=your_server_id_here
     ```

4. 봇 실행:
   ```
   node index.js
   ```

## 사용 방법

- 봇은 `ALLOWED_SERVER_ID`로 지정된 서버에서만 작동합니다.
- `ALLOWED_USER_IDS`에 명시된 사용자만 봇과 상호작용할 수 있습니다.
- 허용된 사용자는 Discord 채널에서 "!claude" 접두사로 메시지를 보내 봇과 대화할 수 있습니다.
  예: "!claude 안녕하세요, 오늘 날씨 어때요?"
- '냥!' 모드 토글 명령어:
  - `!nyanmode on`: '냥!' 모드를 활성화합니다. 봇의 모든 응답 문장이 '냥!'으로 끝납니다.
  - `!nyanmode off`: '냥!' 모드를 비활성화합니다. 봇이 일반적인 말투로 응답합니다.

## 주의사항

- `.env` 파일의 민감한 정보를 절대 공개하지 마세요.
- 24/7 운영을 위해서는 클라우드 서비스 등을 이용한 호스팅을 고려하세요.