# 한국 공휴일 D-day (크롬 확장 프로그램)

툴바에 **다음 공휴일까지 D-day** 를 띄우고, 클릭하면 오늘 상태·이번 달 달력·다가오는 공휴일을 보여줍니다.
대체공휴일·임시공휴일은 Korea Holidays API 에서 받아 오므로 따로 업데이트할 필요가 없습니다.

## 직접 설치 (개발자 모드)

1. 이 폴더(`integrations/chrome-extension`)를 내려받습니다.
2. 크롬 주소창에 `chrome://extensions` → 오른쪽 위 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드합니다** → 이 폴더 선택

## 크롬 웹 스토어에 올리기

1. 저장소 최상위에서 `npm run pack:extension` → `dist/korea-holidays-extension.zip` 생성
2. [Chrome Web Store 개발자 대시보드](https://chrome.google.com/webstore/devconsole)에 등록(최초 1회 등록비가 있습니다) 후 zip 업로드
3. 권한 설명: `alarms`(1시간마다 D-day 갱신), `storage`(오프라인일 때 마지막 정보 표시), API 주소 접근(공휴일 정보 조회)

## 동작

- 배지: 1시간마다 `/holidays/next` 로 갱신. 공휴일 당일은 초록색 `오늘`
- 팝업: `/holidays/check`, `/holidays/next`, `/holidays?year=&month=` 사용. 받은 응답은 저장해 두고 오프라인이면 그 값을 보여줍니다.
