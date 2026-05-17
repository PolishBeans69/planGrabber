import puppeteer from "puppeteer";
import credentials from "./hidden.js"
import tracer from "tracer"
import fs from "fs"
const logger = tracer.colorConsole()
import path, { parse } from 'path'
import { spawn } from 'child_process'

//puppet-browser
const puppet = async (login, pass) => {
    const browser = await puppeteer.launch({
        headless: "new",
        slowMo: 50,
        timeout: 60000,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--window-size=1280,720"
        ]
    });
    const page = await browser.newPage()
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('https://portal.librus.pl/rodzina', { waitUntil: "networkidle2" })
    await page.waitForSelector('button.modal-button__primary', { visible: true })
    await page.locator('button.modal-button__primary').click()
    await page.waitForSelector('.btn.btn-third.btn-synergia-top.btn-navbar.dropdown-toggle', { visible: true })
    await page.locator('.btn.btn-third.btn-synergia-top.btn-navbar.dropdown-toggle').click()
    await page.waitForSelector('xpath=//a[contains(@class, "dropdown-item--synergia") and contains(., "Zaloguj")]', { visible: true });
    await page.locator('xpath=//a[contains(@class, "dropdown-item--synergia") and contains(., "Zaloguj")]').click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    logger.info("LOGIN SITE");
    await page.waitForSelector('#caLoginIframe');
    const iframeElement = await page.$('#caLoginIframe');
    const frame = await iframeElement.contentFrame();
    await frame.waitForSelector('input[name="Login"]', { visible: true });
    await frame.type('input[name="Login"]', login, { delay: 50 });
    await frame.type('input[name="Pass"]', pass, { delay: 50 });
    await frame.click('#LoginBtn')
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => { })
    logger.info("LOGGED")
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.goto('https://synergia.librus.pl/przegladaj_plan_lekcji')
    ])
    logger.info("PLAN")
    const html1 = await page.content()
    fs.writeFileSync("./plan_lekcji1.html", html1)
    logger.info("FILE 1 WRITTEN")
    await page.waitForSelector('a[onclick="zmienTydzien(1);"]');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('a[onclick="zmienTydzien(1);"]')
    ]);
    const html2 = await page.content()
    fs.writeFileSync("./plan_lekcji2.html", html2)
    logger.info("FILE 2 WRITTEN")
    await browser.close()
}

//parsing html
const clearer = async () => {
    const pyClear = spawn('./pyParser.py', ['CLEARMODE'])
    let output = ""
    pyClear.stdout.on('data', (data) => output += data.toString())
    pyClear.stdout.on('close', (code) => logger.info(JSON.stringify({ code: code, data: output }, 3, 3)))
}
const parser = async (filename) => {
    const pyParser = spawn('./pyParser.py', [`${filename}`])
    let output = ""
    pyParser.stdout.on('data', (data) => output += data.toString())
    pyParser.stdout.on('close', (code) => logger.info(JSON.stringify({ code: code, data: output }, 3, 3)))
}

//main function
const main = async () => {
    try {
        logger.info(credentials.LIBRUS_LOGIN)
        await puppet(credentials.LIBRUS_LOGIN, credentials.LIBRUS_PASSWORD)
        await clearer()
        await parser("plan_lekcji1.html")
        await parser("plan_lekcji2.html")
        return 0
        process.exit()
    } catch (err) {
        logger.error("CRITICAL ERROR")
        logger.error(err)
        return 1
        process.exit()
    }
}
main()