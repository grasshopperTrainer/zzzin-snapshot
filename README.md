# zzzin-snapshot

웹 페이지의 특정 요소를 캡처하여 지정된 위치에 업로드하는 Puppeteer 기반 마이크로서비스.

## API

### `GET /heartbeat`

서버 상태 확인.

```json
{ "status": "ok" }
```

### `POST /screenshot`

페이지의 특정 요소를 캡처하여 업로드.

**요청:**
```json
{
  "url": "https://zzzin.net/preview/03167da8",
  "selector": "[data-snapshot-ready]",
  "upload_url": "https://s3.../thumbnails/03167da8.webp?X-Amz-..."
}
```

| 파라미터 | 설명 |
|---|---|
| `url` | 캡처할 페이지 주소 |
| `selector` | 캡처할 요소의 CSS 셀렉터 |
| `upload_url` | presigned URL 또는 로컬 파일 경로 (디버깅용) |

**응답:**
```json
{ "status": "ok" }
```

### 캡처 흐름

1. `page.goto(url, { waitUntil: 'networkidle2' })`
2. `page.waitForSelector(selector, { timeout: 30000 })`
3. `element.screenshot({ type: 'webp', quality: 80 })`
4. `upload_url`에 PUT (HTTP) 또는 파일 저장 (로컬 경로)

## 설계 원칙

- **도메인 무관**: 이 서비스는 zzzin을 모른다. URL, 셀렉터, 업로드 위치를 모두 호출자가 결정한다.
- **저장소 무관**: S3 자격증명을 보유하지 않는다. 호출자가 presigned URL을 생성하여 전달한다.
- **캡처 전용**: 이 서비스의 유일한 책임은 "주어진 URL의 특정 요소를 캡처하여 지정된 위치에 저장"하는 것이다.

## 스택

- **런타임**: Node.js
- **HTTP**: Hono
- **브라우저**: Puppeteer (Chrome headless)
- **컨테이너**: Docker (Chromium 포함)
- **배포**: Railway

## 개발

```bash
npm install
npm test        # 전체 테스트
npm run dev     # 개발 서버 (파일 변경 시 자동 재시작)
npm start       # 서버 실행
```

### 서버 실행

```bash
# 기본 포트 (6666)
npm start

# 포트 지정
PORT=8080 npm start
```

### 디버깅

`upload_url`에 로컬 파일 경로를 넣으면 S3 없이 캡처 결과를 확인할 수 있다.

```bash
# 서버 실행
npm start

# 다른 터미널에서 요청
curl -X POST http://localhost:6666/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3000/preview/abc",
    "selector": "[data-snapshot-ready]",
    "upload_url": "./debug.webp"
  }'

# debug.webp 파일이 생성됨
```

## 분리 이유

- Chromium은 메모리/CPU 집약적 (~200MB 상시 점유)
- API 서버와 Chromium 프로세스 간 간섭 방지 (크래시 격리)
- 독립적 스케일링 가능

## 블로커

- [zzzin-api#14](https://github.com/grasshopperTrainer/zzzin-api/issues/14): `GET /issues/{issue_id}/public` 공개 API 필요 (현재 preview 라우트는 인증 필요)
