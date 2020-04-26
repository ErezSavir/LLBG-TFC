const puppeteer = require('puppeteer');
const chalk = require('chalk');
const log = console.log;

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://brin.iaa.gov.il/aeroinfo/AeroInfo.aspx?msgType=Weather');
    await page.waitForSelector("#chkNorth");
    await page.click("#chkNorth")
    await page.waitForSelector("#chkSouth");
    await page.click("#chkSouth")

    await page.click('#btnSearch');

    await page.waitForSelector("#btnSearch",{visible: true, timeout: 30000})


    await page.waitFor(3000);


    const result = await page.$$eval('.tblMainInfo tr', rows => {
        return Array.from(rows, row => {
          const columns = row.querySelectorAll('.MsgText');
          return Array.from(columns, column => column.innerText);
        });
      });
    //console.log(result);
    var resultArr = {
      depRunway : "",
      arrRunway : "",
      metar :""
    };
    for (let i = 0 ; i < result.length; i ++){
      let depRwy = result[i].find(a => a.includes("DEPARTURE RUNWAY"));
      let arr = result[i].find(a => a.includes("EXPECT"));
      let metar = result[i].find(a => a.includes("METAR"));
      if (depRwy !== undefined){
        resultArr.depRunway = depRwy;
      }
      if (arr !== undefined){
        resultArr.arrRunway = arr;;
      }
      if (metar !== undefined){
        resultArr.metar = metar;
      }
    }

    log(chalk.blue(resultArr.depRunway));
    log(resultArr.arrRunway);
    log(resultArr.metar);
    

    await browser.close();
})();