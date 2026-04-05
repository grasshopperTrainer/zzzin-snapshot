// 환경변수를 한 곳에서 읽고 검증하는 모듈
// 필수 환경변수가 없으면 서버가 시작되지 않고 에러를 던짐

// uploader 종류: "s3" (프로덕션) 또는 "local" (로컬 테스트)
const uploader = process.env.UPLOADER;
if (!uploader) {
  throw new Error("UPLOADER environment variable is required (s3 or local)");
}
if (uploader !== "s3" && uploader !== "local") {
  throw new Error(`Invalid UPLOADER value: "${uploader}" (must be s3 or local)`);
}

// 공통 필수 환경변수
const required = ["FRONTEND_URL"];

// S3 모드일 때만 S3 관련 환경변수 필요
if (uploader === "s3") {
  required.push("S3_BUCKET", "S3_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY");
}

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

// 검증된 설정값을 export
const config = {
  port: process.env.PORT || 6666,
  uploader,
  frontendUrl: process.env.FRONTEND_URL,
  // S3 설정 — uploader가 "s3"일 때만 사용됨
  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // 로컬 저장 경로 — uploader가 "local"일 때 사용
  localDir: process.env.LOCAL_UPLOAD_DIR || "./uploads",
};

export default config;
