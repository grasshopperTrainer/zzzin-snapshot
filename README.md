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

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `url` | ✅ | 캡처할 페이지 주소 |
| `selector` | ✅ | 캡처할 요소의 CSS 셀렉터 |
| `upload_url` | ✅ | presigned URL 또는 로컬 파일 경로 (디버깅용) |
| `timeout` | | 셀렉터 대기 시간 ms (기본 30000) |
| `device_scale_factor` | | 캡처 해상도 배율 (기본 1, Retina는 2) |

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

## CI/CD

```
push (모든 브랜치) → CI: npm test + Docker build
GitHub release 생성 → CD: Railway 배포
```

- **버저닝**: semantic versioning (`v0.1.0`, `v1.0.0`, ...)
- **배포 트리거**: GitHub에서 release를 publish하면 자동 배포
- **DEPLOY_VERSION**: release 태그가 Railway 환경변수로 설정됨

### 배포 방법

1. GitHub에서 새 release 생성
2. 태그: `v0.1.0` 형식
3. CD 워크플로우가 자동으로 Railway에 배포

### 필요한 GitHub Secrets

| Secret | 설명 |
|---|---|
| `RAILWAY_TOKEN` | Railway API 토큰 |
| `RAILWAY_PROJECT_ID` | Railway 프로젝트 ID |
| `RAILWAY_SERVICE_ID` | Railway 서비스 ID |

## 분리 이유

- Chromium은 메모리/CPU 집약적 (~200MB 상시 점유)
- API 서버와 Chromium 프로세스 간 간섭 방지 (크래시 격리)
- 독립적 스케일링 가능

## 블로커

- [zzzin-api#14](https://github.com/grasshopperTrainer/zzzin-api/issues/14): `GET /issues/{issue_id}/public` 공개 API 필요 (현재 preview 라우트는 인증 필요)
