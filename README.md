# zzzin-snapshot

zzzin Issue 페이지의 스냅샷(썸네일)을 생성하는 Puppeteer 기반 마이크로서비스.

## 개요

publish 시 zzzin 프론트엔드의 `/preview/:issueId` 라우트를 Puppeteer로 열어 스크린샷을 찍고, S3에 업로드하여 thumbnail URL을 반환한다.

## 아키텍처

```
zzzin-api (publish 트리거)
  → POST /screenshot { issueId, pageWidth, pageHeight }
  → zzzin-snapshot 서비스
      → Puppeteer: https://zzzin.net/preview/{issueId} 접근
      → viewport를 pageWidth x pageHeight로 설정
      → [data-snapshot-ready] 대기
      → page.screenshot()
      → S3 업로드
  → { image_url } 반환
  → zzzin-api: publication.thumbnail_url 저장
```

### 관련 레포

| 레포 | 역할 |
|---|---|
| [zzzin](https://github.com/grasshopperTrainer/zzzin) | 프론트엔드 — `/preview/:issueId` 라우트 제공 |
| [zzzin-api](https://github.com/grasshopperTrainer/zzzin-api) | 백엔드 — publish 시 스냅샷 트리거, thumbnail_url 저장 |
| **zzzin-snapshot** (이 레포) | 스냅샷 서비스 — Puppeteer 캡처 + S3 업로드 |

## API

### `POST /screenshot`

```json
{
  "issue_id": "03167da8-eb5b-4b20-9c29-6c18c035bb47",
  "page_width": 1000,
  "page_height": 1400
}
```

**응답:**
```json
{
  "image_url": "https://s3.../thumbnails/03167da8.webp"
}
```

### 캡처 흐름

1. 요청 수신 (issue_id, page_width, page_height)
2. `page.setViewport({ width: page_width, height: page_height })`
3. `page.goto(FRONTEND_URL/preview/{issue_id}, { waitUntil: 'networkidle2' })`
4. `page.waitForSelector('[data-snapshot-ready]', { timeout: 30000 })`
5. `page.screenshot({ type: 'webp', quality: 80 })`
6. S3 업로드
7. `{ image_url }` 반환

## 스택

- **런타임**: Node.js
- **HTTP**: Hono
- **브라우저**: Puppeteer (Chrome headless)
- **컨테이너**: Docker (Chromium 포함)
- **배포**: Railway
- **저장소**: S3 (presigned URL)

## 분리 이유

- Chromium은 메모리/CPU 집약적 (~200MB 상시 점유)
- API 서버와 Chromium 프로세스 간 간섭 방지 (크래시 격리)
- 독립적 스케일링 가능

## 프론트엔드 preview 라우트

zzzin 프론트의 `/preview/:issueId`는 스냅샷 전용 라우트:

- 카메라/backdrop/UI chrome 없음
- page를 0,0에 1:1 배치, container 크기 = page 크기
- 폰트 + 이미지 로드 완료 시 `data-snapshot-ready="true"` 속성 부여
- 기존 뷰어와 렌더링 코드 공유 → 에디터/뷰어 변경 시 자동 반영

## 설계 결정

### 왜 별도 서비스인가?
Chromium이 API 서버와 같은 프로세스에서 실행되면 메모리/CPU 경쟁, Chromium 크래시 시 API 서버 영향 등의 문제가 발생할 수 있다. Docker 컨테이너로 격리하여 안정성을 확보한다.

### 왜 클라이언트 캡처가 아닌가?
클라이언트 캡처 라이브러리(html2canvas, html-to-image)는 DOM을 재렌더링하는 방식이라 CSS columns, clip-path를 정확히 렌더링하지 못한다. Puppeteer는 실제 브라우저 렌더링 엔진(Chrome DevTools Protocol)을 사용하므로 100% 정확하다.

### 왜 별도 클라이언트 앱이 아닌가?
별도 앱으로 만들면 렌더링 코드(Quill, Pusher, viewport 등)를 이중 관리해야 한다. 기존 배포된 프론트의 `/preview` 라우트를 사용하면 에디터/뷰어 변경 시 스냅샷도 자동으로 일관성이 유지된다.

## 블로커

- [zzzin-api#14](https://github.com/grasshopperTrainer/zzzin-api/issues/14): `GET /issues/{issue_id}/public` 공개 API 필요 (현재 preview 라우트는 인증 필요)
