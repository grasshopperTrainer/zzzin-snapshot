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
//
// **찍는 환경에서 정착한 결과를 찍는다.**
//
// 종전에는 기본 뷰포트로 열어 ready 를 본 뒤 뷰포트를 바꿔 찍었다. 그런데 페이지의
// "다 그렸다" 판정은 그 시점의 뷰포트에서만 유효하다 — 뷰포트를 바꾸면 리플로우가 새로
// 일어나고, 그때부터 받아야 하는 이미지가 생긴다. 그것을 아무도 기다리지 않아 **덜 그려진
// 채로 박혔다** (실측: 아래쪽 이미지가 빈 채로 캡처). 재정착 없이 deviceScaleFactor 만
// 바꿔 2x 를 찍던 것도 같은 결함이고, DSF 는 조판을 뒤집을 수 있는 축이다.
//
// 그래서 **뷰포트를 먼저 정하고, 그 환경에서 ready 를 기다린 뒤 찍는다.** 문서 크기는
// 미리 모르므로 한 번 재는 패스가 앞에 붙고, 배율마다 다시 연다. 썸네일은 한 번 찍히면
// 그 조판이 그대로 박히니, 페이지 로드 몇 번보다 잘못 박히는 비용이 훨씬 크다.
export async function capture({ url, selector, timeout = 30000, scales = [{ deviceScaleFactor: 1 }] }) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // 1. 크기 재기 — 이 패스의 결과물은 쓰지 않는다. 뷰포트를 정하기 위한 것뿐.
    let t = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const probe = await page.waitForSelector(selector, { timeout });
    const box = await probe.boundingBox();
    const vpWidth = Math.ceil(box.x + box.width);
    const vpHeight = Math.ceil(box.y + box.height);
    console.log(`[capturer] probe — ${Date.now() - t}ms, element box ${vpWidth}x${vpHeight}`);

    // 2. 배율마다: 뷰포트를 먼저 맞추고 → 다시 열어 → 그 환경의 ready 를 기다려 → 찍는다.
    const results = [];
    for (const { deviceScaleFactor = 1 } of scales) {
      t = Date.now();
      await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor });
      await page.reload({ waitUntil: "domcontentloaded" });

      // reload 로 이전 핸들은 무효 — 다시 찾는다.
      const element = await page.waitForSelector(selector, { timeout });

      const settledBox = await element.boundingBox();
      const settledW = Math.ceil(settledBox.x + settledBox.width);
      const settledH = Math.ceil(settledBox.y + settledBox.height);
      if (settledW !== vpWidth || settledH !== vpHeight) {
        // 뷰포트에 따라 문서 크기가 달라지는 경우 — 잘림을 남기지 않도록 알린다.
        console.warn(
          `[capturer] box changed after resize — probe ${vpWidth}x${vpHeight}, settled ${settledW}x${settledH}`,
        );
      }

      const buffer = await element.screenshot({ type: "webp", quality: 80 });
      results.push(buffer);
      console.log(`[capturer] screenshot ${deviceScaleFactor}x — ${Date.now() - t}ms, ${buffer.length} bytes`);
    }

    return results;
  } finally {
    await page.close();
  }
}
