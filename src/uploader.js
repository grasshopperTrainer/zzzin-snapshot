// Uploader: 업로드 부품의 공통 인터페이스 (부모 클래스)
// 모든 업로더는 이 클래스를 상속하고 upload()를 구현해야 함
export class Uploader {
  // buffer: 이미지 바이너리, issueId: 파일명에 쓸 ID
  // 반환: 업로드된 파일의 URL (string)
  async upload(buffer, issueId) {
    throw new Error("upload()를 구현해야 합니다");
  }
}
