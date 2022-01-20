const pdfjs = require("pdfjs-dist/legacy/build/pdf");
const _ = require("lodash");
const fs = require("fs");
const { exec } = require("child_process");

async function main(pdfFile) {
  const pdfName = pdfFile.slice(0, -4);
  const outlineFile = pdfName + "_bookmarks.txt";

  if (fs.existsSync(outlineFile)) {
    fs.unlinkSync(outlineFile);
  }

  const pageOutline = [];

  const pdf = await pdfjs.getDocument(pdfFile).promise;
  const numPages = pdf.numPages;
  const pageNumbers = Array.from(Array(numPages), (_, x) => x + 1);
  // Start reading all pages 1...numPages
  const promises = pageNumbers.map((pageNo) => pdf.getPage(pageNo));
  // Wait until all pages have been read
  const pages = await Promise.all(promises);
  // You can do something with pages here.
  for (const page of pages) {
    const textContent = await page.getTextContent();
    const textItems = textContent.items;
    var finalString = "";
    var lineString = "";
    var line = 0;

    let lastFontSize = 0;

    for (var i = 0; i < textItems.length; i++) {
      const textItem = textItems[i];

      const tx = textItem.transform;

      var fontSize = Math.ceil(Number(tx[0]).toFixed(2));

      if (fontSize >= 17) {
        console.log("tx=", tx);
        console.log("fontSize=", fontSize);
      }

      if (line != textItem.transform[5]) {
        if (line != 0) {
          finalString += "\n";
          if (lastFontSize == 36 || lastFontSize == 24 || lastFontSize == 18) {
            pageOutline.push(
              `${lastFontSize == 36 ? "+" : lastFontSize == 24 ? "++" : "+++"}"${lineString}"|${page.pageNumber}`
            );
          }
          lineString = "";
        }

        line = textItem.transform[5];
      }
      var item = textItem;

      finalString += item.str;
      lineString += item.str;

      lastFontSize = fontSize;
    }
  }

  console.log("pageOutline=", pageOutline);

  // 找到第一个1级标题（跳过TOC）
  const header1 = pageOutline.findIndex((outline) => outline.charAt(1) != "+");

  fs.writeFileSync(outlineFile, pageOutline.slice(header1).join("\n"));

  const command = `pdfbm "${pdfFile}" "${outlineFile}" "${pdfName}_with_bookmarks.pdf"`;

  console.log(command);

  console.log();

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
    }

    console.log("done.");
  });
}

const myArgs = process.argv.slice(2);

if (myArgs.length === 1) {
  const pdfFile = myArgs[0];

  if (fs.existsSync(pdfFile)) {
    main(pdfFile);
  } else {
    console.error(`${pdfFile} does not exist.`);
  }
} else {
  console.error("Please specify pdf name");
}

/**
+"Foreword"|1
+"Chapter 1: Introduction"|2
++"1.1 Python"|2
+++"1.1.1 Basic syntax"|2
+++"1.1.2 Hello world"|3
++"1.2 Exercises"|4
+"Chapter 2: Conclusion"|5
 */
