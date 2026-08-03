# CLAUDE.md

## 배포 흐름

1. `dev` 브랜치에서 작업 → push (CI: lint/test/docker build)
2. PR 생성 (`dev` → `main`) → CI 확인
3. PR 머지
4. GitHub release 생성 (태그: `vX.Y.Z`) → `deploy-prod.yml` 이 Lightsail 인스턴스 `zzzin-prod` 에 자동 배포
5. 배포 확인: 워크플로 로그 + 인스턴스에서 `docker compose logs snapshot`

## 운영 환경 (2026-08 인스턴스 전환)

- prod: Lightsail 인스턴스 `zzzin-prod` 의 docker compose 스택 (구성 원본: `zzzin-infra/lightsail/`)
- **내부 전용 서비스** — 공개 엔드포인트 없음. api 가 compose 네트워크에서 `http://snapshot:6666` 으로 호출
- `PORT=6666` (compose 가 주입), `shm_size: 512m` (Chrome /dev/shm 크래시 방지)
- 클라우드 dev 없음 — 로컬은 `npm start` 또는 zzzin-api 의 `compose.local.yml --profile snapshot`

## GitHub Secrets

| Secret | 설명 |
|---|---|
| `ZZZIN_PROD_HOST` | 인스턴스 고정 IP |
| `ZZZIN_PROD_HOST_KEY` | known_hosts 항목 (ssh-keyscan) |
| `ZZZIN_PROD_SSH_KEY` | 배포용 SSH 개인키 |

## 로그 확인

```bash
ssh ubuntu@<ZZZIN_PROD_HOST> 'cd /srv/zzzin && docker compose logs -f snapshot'
```
