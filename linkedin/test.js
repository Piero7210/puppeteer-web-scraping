const cheerio = require("cheerio");
const fetch = require('node-fetch');
const { Sequelize, DataTypes } = require('sequelize');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Conexión a la base de datos con Sequelize
const sequelize = new Sequelize('jobs_db', 'root', '987210', {
    host: 'localhost',
    dialect: 'mysql'
});

// Modelo de la tabla PreJob
const PreJob = sequelize.define('PreJob', {
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
    date_scraped: DataTypes.DATE
}, {
    tableName: 'pre_jobs',
    timestamps: false
});


async function getJobDetails (jobId) {
    try {
        // Configura tu proxy
        const proxyUrl = 'http://80c437873bbc27d63aa9:60e5506f4a26d525@gw.dataimpulse.com:83';
        const proxyAgent = new HttpsProxyAgent(proxyUrl);

        const response = await fetch(`https://pe.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`, {
            // "agent": proxyAgent,
            "headers": {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
              "accept": "*/*",
              "accept-language": "es-419,es;q=0.9",
              "cache-control": "no-cache",
              "csrf-token": "ajax:5170841439896626426",
              "pragma": "no-cache",
              "priority": "u=1, i",
              "sec-ch-ua": "\"Microsoft Edge\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": "\"Windows\"",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin",
              "Referer": "https://pe.linkedin.com/jobs/search?keywords=Contact%2BCenter%2BAssociate&location=%C3%81rea%2Bmetropolitana%2Bde%2BLima&geoId=90010207&trk=public_jobs_jobs-search-bar_search-submit&original_referer=https%3A%2F%2Fpe.linkedin.com%2Fjobs%2Fview%2Fcontact-center-associate-at-bbva-en-per%25C3%25BA-4039219506%3Fposition%3D9%26pageNum%3D2%26refId%3D%252B9dmO5j2GGrsPARvagZ0Ag%253D%253D%26trackingId%3DQl5I0QGjhiOE55nRGNREBw%253D%253D&currentJobId=4039808254&position=3&pageNum=0",
              "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
          });

        const content = await response.text();
        const $ = cheerio.load(content);

        const postedTimeAgo = $(".posted-time-ago__text").text().trim();
        const numberOfApplicants = $(".num-applicants__caption").text().trim();
        // let jobDescription = $(".show-more-less-html__markup").html();
        let jobDescription = $(".show-more-less-html__markup").text().trim();
        // jobDescription = jobDescription
        //     ?.replaceAll("<br>", "\n")
        //     ?.replaceAll("<p>", "\n")
        //     ?.replaceAll("</p>", "\n")
        //     ?.replaceAll("<b>", "")
        //     ?.replaceAll("</b>", "")
        //     ?.replaceAll("<strong>", "")
        //     ?.replaceAll("<li>", "- ")
        //     ?.replaceAll("</li>", "\n")
        //     ?.replaceAll("<ul>", "\n")
        //     ?.replaceAll("</ul>", "\n")
        
        // const $1 = cheerio.load(jobDescription);
        // jobDescription = $1.text().trim();

        const company = $(".topcard__org-name-link").text().trim();
        const location = $(".topcard__flavor--bullet").first().text().trim()?.replaceAll("\n", "");
        const jobTitle = $(".topcard__title").text().trim();

        const jobDetails = {
            company,
            location,
            jobTitle,
            postedTimeAgo,
            numberOfApplicants,
            jobDescription,
        };
        return jobDetails;

    } catch (error) {
        console.error('Error fetching job details:', error);
    }
}

async function searchJobs (keyword, page) {
    try {
        const offset = (page - 1) * 25;
        const response = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keyword)}&location=Per%C3%BA&geoId=102927786&f_TPR=r604800&position=1&pageNum=0&original_referer=&start=${offset}`, {
            "headers": {
                "accept": "*/*",
                "accept-language": "es-419,es;q=0.9",
                "cache-control": "no-cache",
                "csrf-token": "ajax:2485174923076059721",
                "pragma": "no-cache",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Microsoft Edge\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "cookie": "JSESSIONID=ajax:2485174923076059721; lang=v=2&lang=es-es; bcookie=\"v=2&dfaad0af-9dc4-419a-8e71-faed17fe02fb\"; bscookie=\"v=1&2024100216245761cea8a2-ca69-4456-8ef8-19a1c64f76d9AQGlspeEPqi8FvTpV6lbgy6pHqT7K1IA\"; AMCVS_14215E3D5995C57C0A495C55%40AdobeOrg=1; _gcl_au=1.1.771257770.1727886326; lidc=\"b=VGST02:s=V:r=V:a=V:p=V:g=3346:u=1:x=1:i=1727886325:t=1727972725:v=2:sig=AQGDSZVDz3rComTDRvbs786x1lf6GVNk\"; __cf_bm=hqHujpoYN.ZYAWs1eppaEMElQzfQ1Tu0CzlUO05.L_Q-1727889067-1.0.1.1-bIekRe.4RPiVQXnjaumZnC4Fay.XO6DAUhpDKsLr8flObLSFkSyvCM5ziWCO9IdHjyY88C1fTdofagXPLf0WZg; _uetsid=edfc3d6080da11ef85af0bfa6b3f0199; _uetvid=edfc505080da11efaaa42db56ffa0d7d; fid=AQH0wJTewIKT8QAAAZJON6bVke3vbQEuBkgXJYOjqYAELXjFbTiC83Ia9bsj7NMz2IM4NEONiaZRvA; fcookie=AQGPGLfpdn1DmAAAAZJON7ReEOs_by9cIbguAL2QMkCTutvGDU_wu3ha4i4BwT0iV6dWsMEHb7Zh0JcijC054sTTqB47TCUFJ5oNcHo2tNT4jALhpFbQiYk_HyT6SOkfniA0aQR8O7f6ooVCzFsZaJt5JuGR01b8JThFsC5rju6jjBPenSsVqc__9Lb2CCcdjTQyrssEWLcDWqFCDxoD-hP662YUke1uxgfcZ0riJwfzTVRbWgF0ZbXiBDpZhpRu02t73Vpkb5x_QuYHLXtliDr7X8ZKt7QZQbolkZCgiXeK1klJntvyne7BmDagZfBLX37pyeTtdSYr9xCylnYsq8b5gkpg4pCSAW+J/A==; ccookie=0001AQEORLOnjZrLCwAAAZJON7ZY50fRZFI9eGz2QPowru/WeiK7QLvaQ0JUu3tRBSm4/7T9JMjkG39epV3z+2nB+ESNFe/mrSf+lFUEkgso6rRLCu8GPWw1Q3QIl/g/whpYkkgDz7jSBR+21+zMlYWfQabqj/BkJ3YUD6nDTIhHYh99JmRmAnEDwdbLm2qAHF3uEwTLu2fEevvy2wU5IA==; AMCV_14215E3D5995C57C0A495C55%40AdobeOrg=-637568504%7CMCIDTS%7C19999%7CMCMID%7C13657082775492645068084613422235201460%7CMCOPTOUT-1727896330s%7CNONE%7CvVersion%7C5.1.1",
                "Referer": "https://www.linkedin.com/jobs/search?keywords=asistente&location=Per%C3%BA&geoId=102927786&f_TPR=r604800&position=1&pageNum=0&original_referer=",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
        console.log(`Status: ${response.status}`);        
        const content = await response.text();
        const $ = cheerio.load(content);

        const jobData = [];
        const jobs = $(".job-search-card");

        jobs.each((index, element) => {
            const id = $(element).attr("data-entity-urn")?.split(":")?.[3];
            const link = $(element).find("a").attr("href")?.split("?")[0];
            const jobTitle = $(element).find("h3.base-search-card__title").text().trim();
            const company = $(element).find("h4.base-search-card__subtitle").text().trim();
            const location = $(element).find("span.job-search-card__location").text().trim();
            const date = $(element).find("time.job-search-card__listdate").attr("datetime");

            jobData.push({
                id,
                link,
                jobTitle,
                company,
                location,
                date,
            });
        });    
        return jobData;
    } catch (error) {
        console.error('Error fetching job listings:', error);
    }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    // const keywords = ['Asistente', 'Practicante', 'Asesor', 'Auxiliar', 'Analista', 'Tecnico', 'Ejecutivo', 'Diseñador', 'Representante', 'Desarrollador', 'Coordinador', 'Soporte', 'Jefe', 'Vendedor', 'Promotor', 'Atencion'];
    const keywords = ['Asistente'];
    const dateScraped = new Date().toISOString().split('T')[0];

    for (const keyword of keywords) {
        let pageNumber = 1;
        const jobData = [];

        while (true) {
            const jobs = await searchJobs(keyword, pageNumber);
            console.log(jobs);
            console.log('---------------------------------');            
            
            if (jobs.length === 0) {
                break;
            }

            for (const job of jobs) {
                const jobDetails = await getJobDetails(job?.id);
                console.log(jobDetails);
                // Espera segundos antes de continuar con el siguiente trabajo
                await sleep(5000);
            }
            pageNumber++;
        }
    }
    // const jobs = await searchJobs('Data', 1);
    // console.log(jobs);    
    // for(i = 0; i < jobs.length; i++) {
    //     const job = jobs[i];
    //     const jobDetails = await getJobDetails(job?.id);
    //     console.log(jobDetails);

    //     // Espera segundos antes de continuar con el siguiente trabajo
    //     await sleep(5000);
    // }
})();