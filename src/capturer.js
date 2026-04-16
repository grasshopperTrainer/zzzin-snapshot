// Puppeteer: Chrome을 코드로 제어하는 라이브러리
import puppeteer from "puppeteer";

// 브라우저 인스턴스를 재사용하기 위한 변수
let browser = null;

async function getBrowser() {
  // 브라우저가 종료되었으면 재생성
  if (!browser || !browser.connected) {
    console.log(`[capturer] launching new browser`);
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    // 예기치 않은 종료 시 변수 초기화
    browser.on("disconnected", () => {
      console.log(`[capturer] browser disconnected`);
      browser = null;
    });
  } else {
    console.log(`[capturer] reusing browser`);
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
    let t = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log(`[capturer] goto — ${Date.now() - t}ms`);

    t = Date.now();
    const element = await page.waitForSelector(selector, { timeout });
    console.log(`[capturer] waitForSelector — ${Date.now() - t}ms`);

    // 요소의 CSS 크기를 한 번만 읽음
    const box = await element.boundingBox();
    const vpWidth = Math.ceil(box.x + box.width);
    const vpHeight = Math.ceil(box.y + box.height);
    console.log(`[capturer] element box — ${vpWidth}x${vpHeight}`);

    const results = [];

    for (const { deviceScaleFactor = 1 } of scales) {
      t = Date.now();
      await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor });
      await element.evaluate((el) => el.getBoundingClientRect());

      const buffer = await element.screenshot({ type: "webp", quality: 80 });
      results.push(buffer);
      console.log(`[capturer] screenshot ${deviceScaleFactor}x — ${Date.now() - t}ms, ${buffer.length} bytes`);
    }

    return results;
  } finally {
    await page.close();
  }
}
