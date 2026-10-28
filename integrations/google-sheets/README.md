# 구글 시트에서 공휴일·영업일 함수 쓰기

`=KR_ADDBUSINESSDAYS(A2, 3)` 처럼 구글 시트에서 바로 쓰는 함수입니다. 회계·인사·물류 담당자도 코드 없이 쓸 수 있어요.

## 설치 (1분)

1. 구글 시트 메뉴 **확장 프로그램 → Apps Script**
2. 기본 코드를 지우고 [`Code.gs`](Code.gs) 내용을 붙여넣기
3. 💾 저장 후 시트로 돌아오기
4. 처음 쓸 때 "외부 서비스에 연결" 권한을 한 번 허용

## 함수

| 함수 | 예시 | 결과 |
|---|---|---|
| `KR_ISHOLIDAY(날짜)` | `=KR_ISHOLIDAY("2026-07-17")` | `TRUE` (제헌절) |
| `KR_HOLIDAYNAME(날짜)` | `=KR_HOLIDAYNAME(A2)` | `한글날` 또는 빈 칸 |
| `KR_ISBUSINESSDAY(날짜, [휴무])` | `=KR_ISBUSINESSDAY(A2)` | 영업일이면 `TRUE` |
| `KR_ADDBUSINESSDAYS(날짜, 일수, [휴무])` | `=KR_ADDBUSINESSDAYS("2026-09-23", 3)` | `2026-09-30` |
| `KR_BUSINESSDAYS(시작, 끝, [휴무])` | `=KR_BUSINESSDAYS("2026-10-01", "2026-10-31")` | `20` |
| `KR_HOLIDAYS(연도)` | `=KR_HOLIDAYS(2026)` | 공휴일 표가 아래로 펼쳐짐 |

- `[휴무]`: `"sat-sun"`(기본, 토·일 휴무), `"sun"`(토요일 근무), `"none"`(공휴일만 휴무)
- `KR_ISHOLIDAY`, `KR_HOLIDAYNAME`, `KR_ISBUSINESSDAY` 는 범위도 받습니다: `=KR_ISHOLIDAY(A2:A100)`
- 공휴일 목록은 연도별로 6시간 캐시되어, 셀이 많아도 API 호출은 연도당 한 번입니다.
- 시트의 시간대가 한국이 아니면 날짜 결과가 하루 밀려 보일 수 있습니다. **파일 → 설정 → 시간대**를 `(GMT+09:00) 서울`로 맞춰 주세요.
