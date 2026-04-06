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

// 한 페이지에서 여러 스케일로 캡처
// url: 캡처할 페이지 주소
// selector: 캡처할 요소의 CSS 셀렉터
// scales: [{ deviceScaleFactor }] — 캡처할 배율 목록
// 반환: [Buffer, ...] — scales 순서대로 캡처 결과
export async function capture({ url, selector, timeout = 30000, scales = [{ deviceScaleFactor: 1 }] }) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const element = await page.waitForSelector(selector, { timeout });

    // 요소의 CSS 크기를 한 번만 읽음
    const box = await element.boundingBox();
    const vpWidth = Math.ceil(box.x + box.width);
    const vpHeight = Math.ceil(box.y + box.height);

    const results = [];

    for (const { deviceScaleFactor = 1 } of scales) {
      await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor });
      // 뷰포트 변경 후 레이아웃 재계산 대기
      await element.evaluate((el) => el.getBoundingClientRect());

      const buffer = await element.screenshot({ type: "webp", quality: 80 });
      results.push(buffer);
    }

    return results;
  } finally {
    await page.close();
  }
}
