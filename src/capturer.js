// Puppeteer: Chrome을 코드로 제어하는 라이브러리
import puppeteer from "puppeteer";

// 브라우저 인스턴스를 재사용하기 위한 변수
let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browser;
}

// 스크린샷 캡처
// url: 캡처할 페이지 주소
// selector: 캡처할 요소의 CSS 셀렉터
export async function capture({ url, selector, timeout = 30000 }) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // 고정 레이아웃이므로 충분히 큰 뷰포트 설정
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(url, { waitUntil: "networkidle2" });

    // 지정된 셀렉터의 요소가 나타날 때까지 대기
    const element = await page.waitForSelector(selector, { timeout });

    // 해당 요소만 캡처
    const buffer = await element.screenshot({ type: "webp", quality: 80 });

    return buffer;
  } finally {
    await page.close();
  }
}
