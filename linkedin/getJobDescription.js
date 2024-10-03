const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

function convertToDate(dateText) {
  const today = new Date();
  dateText = dateText.toLowerCase();
  if (dateText.includes("hoy")) {
    return today;
  } else if (dateText.includes("ayer")) {
    return new Date(today.setDate(today.getDate() - 1));
  } else if (dateText.includes("hora")) {
    const hours = parseInt(dateText.match(/\d+/)[0], 10);
    return new Date(today.setHours(today.getHours() - hours));
  } else if (dateText.includes("día") || dateText.includes("días")) {
    const days = parseInt(dateText.match(/\d+/)[0], 10);
    return new Date(today.setDate(today.getDate() - days));
  } else {
    return today;
  }
}

async function getJobDescription(jobDescriptionHref) {
  const maxRetries = 5;
  const backoffFactor = 2;
  let delay = 1000; // in milliseconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--ignore-certificate-errors",
            "--ignore-ssl-errors",
            "--incognito",
        ],
      });
      const page = await browser.newPage();
      await page.goto(jobDescriptionHref, { waitUntil: "domcontentloaded" });

      const content = await page.content();
      const $ = cheerio.load(content);

      const jobTitle = $("h1.top-card-layout__title").text().trim();
      const company = $("span.topcard__flavor").text().trim();
      const location = $("span.topcard__flavor--bullet").text().trim();
      const date = $("span.posted-time-ago__text").text().trim();
      const jobDate = convertToDate(date);
      const jobDescription = $("div.show-more-less-html__markup").text().trim();
      const typeOfJob = $("h3.description__job-criteria-subheader")
        .eq(1)
        .next("span")
        .text()
        .trim();

      const result = {
        title: jobTitle,
        company: company,
        location: location,
        date: jobDate,
        type_of_job: typeOfJob,
        description: jobDescription,
      };

      console.log(result);
      console.log("-----------------------------------");

      await browser.close();
      return result;
    } catch (error) {
      console.error(`Error al obtener la descripción del empleo: ${error}`);
      if (error.message.includes("429")) {
        console.log(
          `Error 429: Demasiadas solicitudes. Esperando ${
            delay / 1000
          } segundos antes de reintentar...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffFactor;
      } else {
        console.error(error.stack);
        return null;
      }
    }
  }

  console.log(
    "Se alcanzó el número máximo de reintentos. No se pudo obtener la descripción del empleo."
  );
  return null;
}

// Exporta la función usando module.exports
module.exports = { getJobDescription };

// Example usage:
// const urlLink =
//   "https://pe.linkedin.com/jobs/view/asistente-administrativo-4030281859?position=2&pageNum=20&refId=3iuXnsh5vO4W8k1fndAH%2FA%3D%3D&trackingId=4%2BKOu3T4TjkoZFpvZPYWfw%3D%3D&trk=public_jobs_jserp-result_search-card&original_referer=";
// getJobDescription(urlLink);
