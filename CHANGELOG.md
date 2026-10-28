# Changelog

## Unreleased

- 디스코드 봇: 슬래시 명령어(`/공휴일`, `/다음공휴일`, `/연차추천`, `/영업일`, `/날짜확인`)를 Worker 에서 바로 처리 (`/discord/interactions`)
- 크롬 확장 프로그램: 툴바 D-day 배지, 이번 달 달력, 다가오는 공휴일

## 0.3.0

- 과거 공휴일 데이터 추가: **2015 ~ 2023년** (지원 연도 2015 ~ 2027). 모든 연도를 공공데이터포털 특일정보와 대조했습니다.
- 급여일·정산일: `/business-days/adjust`, `/business-days/nth`, `/business-days/month`
- 입사일 기준 연차 개수: `/annual-leave` (근로기준법 제60조) + 연차 계산기 페이지
- 쇼핑몰 출고일: `/shipping-date` + 삽입형 위젯 `widget.js`
- MCP 서버 `/mcp`: Claude 등 AI 비서가 도구로 호출
- 영어 페이지 `/en`, 카카오톡 공유(키 설정 시), GitHub 이슈 양식
- npm·PyPI 패키지에 같은 함수 추가 (`adjustToBusinessDay`, `nthBusinessDay`, `businessDaysInMonth`, `annualLeave`, `shippingDate`)
- 구글 시트 함수 추가: `KR_ADJUSTBUSINESSDAY`, `KR_NTHBUSINESSDAY`

## 0.2.0

- 첫 npm 배포. 연차 꿀조합 추천, 연휴 목록, iCal 구독, 영업일 옵션(토요일 근무·회사 휴일), 기념일
