// Puppeteer: Chrome을 코드로 제어하는 라이브러리
// launch()로 브라우저를 띄우고, page 객체로 페이지를 조작함
import puppeteer from "puppeteer";
import config from "./config.js";

// 브라우저 인스턴스를 재사용하기 위한 변수
// 매 요청마다 브라우저를 새로 띄우면 느리므로, 한 번 띄워서 계속 사용
let browser = null;

// 브라우저가 없으면 새로 띄우고, 있으면 기존 것을 반환
async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      // headless: true — 화면 없이 백그라운드에서 실행 (서버 환경)
      headless: true,
      args: [
        // Docker 컨테이너 안에서 Chrome을 실행하기 위한 필수 옵션
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });
  }
  return browser;
}

// 스크린샷 캡처 핵심 함수
// issueId: 캡처할 이슈 ID
// pageWidth, pageHeight: 뷰포트(화면) 크기
export async function capture({ issueId, pageWidth, pageHeight }) {
  const browser = await getBrowser();

  // 새 탭을 열어서 작업 (다른 요청과 독립적으로 동작)
  const page = await browser.newPage();

  try {
    // 뷰포트 크기 설정 — 이 크기가 스크린샷의 해상도가 됨
    await page.setViewport({ width: pageWidth, height: pageHeight });

    // 프론트엔드의 preview 페이지로 이동
    // waitUntil: 'networkidle2' — 네트워크 요청이 2개 이하로 줄어들 때까지 대기
    // (폰트, 이미지 등 리소스 로딩 완료를 기다리기 위함)
    const url = `${config.frontendUrl}/preview/${issueId}`;
    await page.goto(url, { waitUntil: "networkidle2" });

    // 프론트엔드가 렌더링 완료 시 [data-snapshot-ready] 속성을 추가함
    // 이 속성이 나타날 때까지 최대 30초 대기
    await page.waitForSelector("[data-snapshot-ready]", { timeout: 30000 });

    // 스크린샷 촬영
    // type: 'webp' — 용량이 작고 품질이 좋은 포맷
    // quality: 80 — 0~100 사이, 80이면 품질/용량 밸런스가 좋음
    const buffer = await page.screenshot({ type: "webp", quality: 80 });

    return buffer;
  } finally {
    // 성공이든 실패든 탭은 반드시 닫아줌 (메모리 누수 방지)
    await page.close();
  }
}
