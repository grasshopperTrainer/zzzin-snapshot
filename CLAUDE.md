# CLAUDE.md

## 배포 흐름

1. `dev` 브랜치에서 작업 → push
2. PR 생성 (`dev` → `main`) → CI 확인
3. PR 머지
4. GitHub release 생성 (태그: `vX.Y.Z`) → CD가 자동으로 Railway production에 배포
5. Railway 로그로 배포 확인

## Railway 환경

| 환경 | 서비스명 | 내부 주소 |
|---|---|---|
| dev | snapshot-dev | `snapshot-dev.railway.internal:8080` |
| production | snapshot | `snapshot.railway.internal:8080` |

- Railway가 `PORT=8080`을 주입함 (코드 기본값 6666과 다름)
- dev 배포: `railway service link snapshot-dev && railway up`
- prod 배포: release 생성으로 자동 트리거

## GitHub Secrets

| Secret | 설명 |
|---|---|
| `RAILWAY_TOKEN` | Railway API 토큰 (workspace 단위) |
| `RAILWAY_PROJECT_ID` | `7819d8bb-744f-457a-827e-914688330fdd` |
| `RAILWAY_SERVICE_ID` | `1f0f5829-8080-4d95-80ce-458231db846d` (production snapshot) |

## 로그 확인

```bash
# Railway CLI
railway service link snapshot-dev  # 또는 snapshot
railway logs

# Railway MCP
mcp__railway__get-logs (logType: deploy, filter: screenshot)
```

## 테스트

```bash
npm test  # 전체 17 테스트
```

- capturer: 6종 이미지 크기/내용 비교 + 잘림 방지 (tiled) + 멀티스케일
- upload: 로컬 저장 + HTTP PUT
- app: 파라미터 검증 + 멀티스케일 저장
- integration: 서버 → 캡처 → 저장 E2E
