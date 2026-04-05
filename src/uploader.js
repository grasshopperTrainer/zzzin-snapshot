// AWS S3 클라이언트 — 파일을 S3 버킷에 업로드하기 위한 SDK
// S3Client: S3 연결 객체, PutObjectCommand: 파일 업로드 명령
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import config from "./config.js";

// S3 클라이언트 초기화 — 리전과 인증 정보를 설정
const s3 = new S3Client({
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

// S3에 스크린샷을 업로드하고 공개 URL을 반환
// buffer: 이미지 바이너리 데이터
// issueId: 파일명에 사용할 이슈 ID
export async function upload(buffer, issueId) {
  // S3에 저장될 경로 (예: thumbnails/03167da8.webp)
  const key = `thumbnails/${issueId}.webp`;

  // PutObjectCommand: S3에 파일을 넣는 명령
  // Bucket: 어떤 버킷에, Key: 어떤 경로에, Body: 어떤 데이터를
  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/webp",
    })
  );

  // S3 공개 URL 반환
  // S3 버킷이 퍼블릭 읽기 허용이거나 CloudFront를 통해 제공되어야 접근 가능
  return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
}
