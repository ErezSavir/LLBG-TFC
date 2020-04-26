const puppeteer = require('puppeteer');
const chalk = require('chalk');
const log = console.log;
const express = require("express")
const app = express()

var resultArr = {
  depRunway: "",
  arrRunway: "",
  metar: ""
};

app.use(express.static("public"))
app.get("/",
async (req, res, next) => {

    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
    const page = await browser.newPage();
    await page.goto('http://brin.iaa.gov.il/aeroinfo/AeroInfo.aspx?msgType=Weather');
    await page.waitForSelector("#chkNorth");
    await page.click("#chkNorth")
    await page.waitForSelector("#chkSouth");
    await page.click("#chkSouth")

    await page.click('#btnSearch');

    await page.waitForSelector("#btnSearch", { visible: true, timeout: 30000 })


    await page.waitFor(3000);


    const result = await page.$$eval('.tblMainInfo tr', rows => {
      return Array.from(rows, row => {
        const columns = row.querySelectorAll('.MsgText');
        return Array.from(columns, column => column.innerText);
      });
    });
    //console.log(result);

    for (let i = 0; i < result.length; i++) {
      let depRwy = result[i].find(a => a.includes("DEPARTURE RUNWAY"));
      let arr = result[i].find(a => a.includes("EXPECT"));
      let metar = result[i].find(a => a.includes("METAR"));
      if (depRwy !== undefined) {
        resultArr.depRunway = depRwy;
      }
      if (arr !== undefined) {
        resultArr.arrRunway = arr;;
      }
      if (metar !== undefined) {
        resultArr.metar = metar;
      }
    }

    log(chalk.green(resultArr.depRunway));
    log(chalk.red(resultArr.arrRunway));
    log(chalk.yellow(resultArr.metar));



    await browser.close();
    var returnVal = "<div style=min-height:90%;width:100%;text-align:center;dispaly:table;>";
    returnVal += "<h1 style=margin:150;padding:0;vertical-align:middle>" + resultArr.depRunway + "</h1>";
    returnVal += "<h1 style=margin:150;padding:0;vertical-align:middle>" + resultArr.arrRunway + "</h1>";
    returnVal += "<h1 style=margin:150;padding:0;vertical-align:middle>" + resultArr.metar + "</h1>";
    returnVal += "</div";
    res.send(returnVal)
  });

// start the server listening for requests
app.listen(process.env.PORT || 3000,
  () => console.log("Server is running..."));