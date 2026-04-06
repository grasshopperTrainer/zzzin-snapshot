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
    // domcontentloaded로 빠르게 진입, 렌더링 완료는 waitForSelector가 보장
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // 셀렉터 요소가 나타날 때까지 대기
    const element = await page.waitForSelector(selector, { timeout });

    // 요소의 실제 크기를 읽어서 뷰포트를 맞춤
    const box = await element.boundingBox();
    await page.setViewport({
      width: Math.ceil(box.x + box.width),
      height: Math.ceil(box.y + box.height),
    });

    // 뷰포트 변경 후 레이아웃이 재계산될 수 있으므로 잠시 대기
    await element.evaluate((el) => el.getBoundingClientRect());

    // 해당 요소만 캡처
    const buffer = await element.screenshot({ type: "webp", quality: 80 });

    return buffer;
  } finally {
    await page.close();
  }
}
