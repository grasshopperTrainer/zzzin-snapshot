// 환경변수를 한 곳에서 읽고 검증하는 모듈
// 필수 환경변수가 없으면 서버가 시작되지 않고 에러를 던짐

// 필수 환경변수 목록 — 여기에 추가하면 자동으로 검증됨
const required = [
  "FRONTEND_URL",
  "S3_BUCKET",
  "S3_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

// 검증된 설정값을 export
// 다른 파일에서 import config from "./config.js" 로 사용
const config = {
  port: process.env.PORT || 6666,
  // 스냅샷을 찍을 프론트엔드 주소 (예: https://zzzin.net)
  frontendUrl: process.env.FRONTEND_URL,
  // S3 설정
  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

export default config;
