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

var resultArrAtisInfo = {
  arrAtis: "",
  depAtis: ""
};

const extendTimeoutMiddleware = (req, res, next) => {
  const space = ' ';
  let isFinished = false;
  let isDataSent = false;

  res.once('finish', () => {
    isFinished = true;
  });

  res.once('end', () => {
    isFinished = true;
  });

  res.once('close', () => {
    isFinished = true;
  });

  res.on('data', (data) => {
    // Look for something other than our blank space to indicate that real
    // data is now being sent back to the client.
    if (data !== space) {
      isDataSent = true;
    }
  });

  const waitAndSend = () => {
    setTimeout(() => {
      // If the response hasn't finished and hasn't sent any data back....
      if (!isFinished && !isDataSent) {
        // Need to write the status code/headers if they haven't been sent yet.
        if (!res.headersSent) {
          res.writeHead(202);
        }

        res.write(space);

        // Wait another 15 seconds
        waitAndSend();
      }
    }, 30000);
  };

  waitAndSend();
  next();
};

app.use(extendTimeoutMiddleware);
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

    // log(chalk.green(resultArr.depRunway));
    // log(chalk.red(resultArr.arrRunway));
    // log(chalk.yellow(resultArr.metar));



    await browser.close();
    var returnVal = "<div style=min-height:90%;width:100%;text-align:center;dispaly:table;>";
    returnVal += "<img src='https://cdn.jetphotos.com/full/6/74002_1546373845.jpg' style='width:100;height:200;'>"
    returnVal += "<h2 style=margin:150;padding:0;vertical-align:middle>" + resultArr.depRunway + "</h2>";
    returnVal += "<h2 style=margin:150;padding:0;vertical-align:middle>" + resultArr.arrRunway + "</h2>";
    returnVal += "<h2 style=margin:150;padding:0;vertical-align:middle>" + resultArr.metar + "</h2>";
    returnVal += "</div";
    res.send(returnVal)
  });

app.get("/zuz",
  async (req, res, next) => {
    const browser = await puppeteer.launch({
      slowMo: 100,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });
    const page = await browser.newPage();
    await page.goto('http://brin.iaa.gov.il/aeroinfo/AeroInfo.aspx?msgType=Weather');
    await page.waitForSelector("#chkNorth");
    await page.click("#chkNorth")
    await page.waitForSelector("#chkSouth");
    await page.click("#chkSouth")
    await page.click('#btnSearch');

    let foundDep = false;
    let foundArr = false;
    outer_loop:
    for (let i = 0; i < 4; i++) {

      if (foundArr && foundDep){
        break;
      }
      
      log("searching for index:" + i);
      await page.waitForSelector("#btnSearch", { visible: true, timeout: 30000 })
      await page.waitFor(3000);
      await page.waitForSelector('.tblMainInfo > tbody > tr.tblBody > td.ImgField > img#DataList2_MoreImg_' + i, { visible: true })
      // await page.evaluate((i) => {
      //   document.querySelector('.tblMainInfo > tbody > tr.tblBody > td.ImgField > img#DataList2_MoreImg_' + i).click();
      // });
      await page.click('.tblMainInfo > tbody > tr.tblBody > td.ImgField > img#DataList2_MoreImg_' + i);
      await page.waitFor(7000);
      const result = await page.$$eval('.tblMoreInfo2 tr', rows => {
        return Array.from(rows, row => {
          const columns = row.querySelectorAll('.more_MsgText');
          return Array.from(columns, column => column.innerText);
        });
      });
      //log("Result for index:" + i + "  " + result[0]);
      // if (result[0].indexOf("THIS IS BEN GURION VOLMET") !== -1) {
      //   log("Found Volmet. Continue");
      //   // Don't care about volmet
      //   continue outer_loop;
      // }
      //log(result[0][0]);
      //log(result[0][0].indexOf("BEN GURION ARRIVAL INFORMATION") !== -1)
      if (result[0][0].indexOf("BEN GURION ARRIVAL INFORMATION") !== -1) {
        //log(result.toString());
        resultArrAtisInfo.arrAtis = result.toString();
        foundArr = true;
      }
      //log(result[0][0].indexOf("BEN GURION DEPARTURE INFORMATION") !== -1)
      if (result[0][0].indexOf("BEN GURION DEPARTURE INFORMATION") !== -1) {
        //log(result.toString());
        resultArrAtisInfo.depAtis = result.toString();
        foundDep = true;
      }

      log("Finished " + i);
    }

    await browser.close();
    resultArrAtisInfo.arrAtis = resultArrAtisInfo.arrAtis.replace(/,/g, '<br>');
    resultArrAtisInfo.depAtis = resultArrAtisInfo.depAtis.replace(/,/g, '<br>');
    var returnVal = "<div style=min-height:90%;width:100%;text-align:center;dispaly:table;>";
    returnVal += "<img src='https://cdn.jetphotos.com/full/6/74002_1546373845.jpg' style='width:100;height:200;'>"
    returnVal += "<h4 style=margin:75;padding:0;vertical-align:middle>" + resultArrAtisInfo.arrAtis + "</h4>";
    returnVal += "<h4 style=margin:75;padding:0;vertical-align:middle>" + resultArrAtisInfo.depAtis + "</h4>";
    returnVal += "</div";
    res.send(returnVal)
  });

// start the server listening for requests
app.listen(process.env.PORT || 3000,
  () => console.log("Server is running..."));