const puppeteer = require("puppeteer");
const { Sequelize, DataTypes } = require('sequelize');
const cheerio = require("cheerio");
const { getJobDescription } = require("./getJobDescription");

// Conexión a la base de datos con Sequelize
const sequelize = new Sequelize("jobs_db", "root", "987210", {
  host: "localhost",
  dialect: "mysql",
});

// Modelo de la tabla PreJob
const PreJob = sequelize.define(
  "PreJob",
  {
    company_name: DataTypes.STRING,
    job_title: DataTypes.STRING,
    location: DataTypes.STRING,
    date: DataTypes.DATE,
    type_of_job: DataTypes.STRING,
    description: DataTypes.TEXT,
    platform: DataTypes.STRING,
    link_url: DataTypes.STRING,
    keyword: DataTypes.STRING,
    state: DataTypes.INTEGER,
    date_scraped: DataTypes.DATE,
  },
  {
    tableName: "pre_jobs",
    timestamps: false,
  }
);

// const keywordsJobs = ['Asistente', 'Practicante', 'Asesor', 'Auxiliar', 'Analista', 'Tecnico', 'Ejecutivo', 'Diseñador', 'Representante', 'Desarrollador', 'Coordinador', 'Soporte', 'Jefe', 'Vendedor', 'Promotor', 'Atencion']
const keywords_jobs = ["Asistente", "Practicante"]; // Keywords for job search

(async () => {
  for (const keyword of keywords_jobs) {
    const urlLinkedin = `https://www.linkedin.com/jobs/search?keywords=${keyword}&location=Perú&geoId=102927786&f_TPR=r604800&position=1&pageNum=0`;

    const date_scraped = new Date().toISOString().split("T")[0]; // Date of data extraction

    // Proxy configuration
    const proxyUrl = "gw.dataimpulse.com:823";
    const username = "80c437873bbc27d63aa9";
    const password = "60e5506f4a26d525";

    // Launch Puppeteer browser with proxy
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",
        "--incognito",
        `--proxy-server=${proxyUrl}`,
      ],
    });

    const page = await browser.newPage();
    await page.authenticate({ username, password });

    try {
      // Verify the IP address
      await page.goto("http://httpbin.org/ip");
      const ipAddress = await page.evaluate(() => document.body.innerText);
      console.log(`IP Address: ${ipAddress}`);

      // Navigate to LinkedIn jobs page
      await page.goto(urlLinkedin);
      await page.waitForSelector(".results-context-header__job-count");

      // Extract the number of jobs
      const numberOfJobs = await page.evaluate(() =>
        parseInt(
          document
            .querySelector(".results-context-header__job-count")
            .textContent.trim()
        )
      );
      console.log(`Number of jobs: ${numberOfJobs}`);

      // Scroll to load more jobs
      let scroll = 0;
      while (scroll < Math.ceil(numberOfJobs / 15)) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        scroll++;

        try {
          const loadMoreButton = await page.$(
            "button[aria-label='Ver más empleos']"
          );
          if (loadMoreButton) {
            await page.evaluate((btn) => btn.click(), loadMoreButton);
          }
        } catch (error) {
          console.log("Error during scrolling or loading more jobs:", error);
          break;
        }
      }

      // Extract job data
      const content = await page.content();
      const $ = cheerio.load(content);
      const jobs = [];

      const link = $("a.base-card__full-link").attr("href");
      console.log(link);
      
      // Iterate over the job links to fetch job descriptions (you can adjust this logic to your existing one)
      for (let i = 0; i < link.length; i++) {
        try {
          const jobDescription = await getJobDescription(link[i]);
          if (jobDescription) {
            const jobData = {
              ...jobDescription,
              platform: "LinkedIn",
              link_url: link[i],
            };
            jobs.push(jobData);
          }
        } catch (error) {
          console.log(
            `Error fetching job description from ${job.link}:`,
            error
          );
        }
      }

      // Guarda los datos en la base de datos PreJob
      try {
        await sequelize.authenticate();
        for (const job of jobsData) {
          await PreJob.create({
            company_name: job.company,
            job_title: job.title,
            location: job.location,
            date: job.date,
            type_of_job: job.type_of_job,
            description: job.description,
            platform: job.platform,
            link_url: job.link_url,
            keyword: keyword,
            state: 1,
            date_scraped: date_scraped,
          });
        }
      } catch (error) {
        console.error(`Error occurred during commit: ${error}`);
      }
    } catch (error) {
      console.log("Error:", error);
    } finally {
      await browser.close(); // Close the browser after job scraping
    }
  }
})();