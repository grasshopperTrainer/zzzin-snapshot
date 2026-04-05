// AWS S3 클라이언트 — 파일을 S3 버킷에 업로드하기 위한 SDK
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Uploader } from "./uploader.js";

// S3Uploader: 프로덕션용 업로더
// S3 버킷에 webp 이미지를 업로드하고 공개 URL을 반환
export class S3Uploader extends Uploader {
  // prefix: S3 내 저장 경로 (프로덕션: "thumbnails", 테스트: "test/thumbnails" 등)
  constructor({ bucket, region, accessKeyId, secretAccessKey, prefix = "thumbnails" }) {
    super();
    this.bucket = bucket;
    this.region = region;
    this.prefix = prefix;
    this.s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload(buffer, issueId) {
    const key = `${this.prefix}/${issueId}.webp`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: "image/webp",
      })
    );

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
