const cheerio = require("cheerio");
const fetch = require('node-fetch');
const { Sequelize, DataTypes } = require('sequelize');
const { HttpsProxyAgent } = require('https-proxy-agent');
//Enlcae principal Frontend : https://www.linkedin.com/jobs/search?keywords={keyword}&location=Perú&geoId=102927786&f_TPR=r604800&position=1&pageNum=0

// Conexión a la base de datos con Sequelize
const sequelize = new Sequelize('jobs_db', 'root', '', {
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

// Función para buscar cada trabajo en LinkedIn por su ID
async function getJobDetails (jobId) {
    try {
        //Configura tu proxy
        //const proxyUrl = 'http://80c437873bbc27d63aa9:60e5506f4a26d525@gw.dataimpulse.com:83';
        //const proxyAgent = new HttpsProxyAgent(proxyUrl);
        //console.log('Proxy agent configurado:', proxyUrl); 

        const proxyUrl = 'http://80c437873bbc27d63aa9:60e5506f4a26d525@gw.dataimpulse.com:823';
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        console.log('Proxy agent configurado:', proxyUrl);             
        
        
        const response = await fetch(`https://pe.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`, {
            agent: proxyAgent,
            timeout: 30000,  // 30 segundos de tiempo de espera
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
                "accept": "*/*",
                "accept-language": "es-419,es;q=0.9",
                "cache-control": "no-cache",
                "Referer": "https://www.linkedin.com/"
            }
        });
        
        console.log(`Status de getJobDetails: ${response.status}`);    
        const content = await response.text();
        const $ = cheerio.load(content);
        
        // Obtiene la descripción del trabajo
        const jobDescription = $(".show-more-less-html__markup").text().trim();
        // Obtiene el tipo de empleo
        const type_of_job = $(".description__job-criteria-subheader")
            .eq(1)
            .next("span")
            .text()
            .trim();

        const jobDetails = {
            type_of_job,
            jobDescription,
        };
        return jobDetails;

    } catch (error) {
        console.error('Error fetching job details:', error);
    }
}

// Función para buscar trabajos en LinkedIn
async function searchJobs (keyword, page) {
    try {
        const offset = (page - 1) * 25;
        const response = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keyword)}&location=Per%C3%BA&geoId=102927786&f_TPR=r604800&position=1&pageNum=0&original_referer=&start=${offset}`, {
            headers: {
                "accept": "*/*",
                "accept-language": "es-419,es;q=0.9",
                "cache-control": "no-cache",
                "Referer": "https://www.linkedin.com/"
            }
        });
        console.log(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keyword)}&location=Per%C3%BA&geoId=102927786&f_TPR=r604800&position=1&pageNum=0&original_referer=&start=${offset}`)
        console.log(`Status de searchJobs: ${response.status}`);        
        const content = await response.text();
        const $ = cheerio.load(content);

        const jobData = [];
        const jobs = $(".job-search-card");

        jobs.each((index, element) => {
            //  if (jobData.length >= 2) return false;  // Limita a 15 trabajos
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

// Función para reintentar una función asíncrona
async function retry(fn, retries = 3, delay = 5000) {
    let attempt = 1;

    while (attempt <= retries) {
        try {
            const result = await fn();
            if (result && result.length != 0) {
                console.log(result);                
                return result;
            }
            console.log(`Resultado vacío. Reintentando... (Intento ${attempt})`);
        } catch (error) {
            console.log(`Error en intento ${attempt}:`, error.message);
        }

        // Esperar un tiempo antes de reintentar
        await sleep(delay);
        attempt++;
        delay *= 2;  // Incrementar el delay exponencialmente
    }

    console.log('Excedido el número máximo de reintentos.');
    return [];  // Retorna un array vacío si no se logró después de varios intentos
}

// Función para esperar un tiempo en milisegundos
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar el script principal
(async () => {
    const keywords = ['Asistente', 'Practicante', 'Asesor', 'Auxiliar', 'Analista', 'Tecnico', 'Ejecutivo', 'Diseñador', 'Representante', 'Desarrollador', 'Coordinador', 'Soporte', 'Jefe', 'Vendedor', 'Promotor', 'Atencion'];
    //const keywords = ['Promotor', 'Atencion']
    for (const keyword of keywords) {
        let pageNumber = 1;
        let jobCount = 0;  // Contador de trabajos por keyword

        while (jobCount < 60) {  // Limitar a 2 trabajos por keyword
            const jobs = await retry(() => searchJobs(keyword, pageNumber), 5, 5000);       
            
            if (jobs.length === 0) {
                console.log('No se encontraron más trabajos o se excedieron los intentos.');
                break;
            }

            for (const job of jobs) {
                if (jobCount >= 60) break;  // Si ya se tienen 2 trabajos, se detiene

                const jobDetails = await retry(() => getJobDetails(job?.id), 5, 5000);

                if (!jobDetails.type_of_job || !jobDetails.jobDescription) {
                    console.log(`Detalles del trabajo incompletos para el trabajo ID: ${job?.id}. No se guardará en la base de datos.`);
                    continue;
                }

                const jobData = {
                    company_name: job.company,
                    job_title: job.jobTitle,
                    location: job.location,
                    date: job.date || new Date().toISOString().split('T')[0],
                    type_of_job: jobDetails.type_of_job,
                    description: jobDetails.jobDescription,
                    platform: 'LinkedIn',
                    link_url: job.link || `https://www.linkedin.com/jobs/view/${job.id}`,
                    keyword: keyword,
                    state: 1,
                    //date_scraped: new Date().toISOString().split('T')[0],
                };

                try {
                   await sequelize.authenticate();
                   await PreJob.create(jobData); 
                   jobCount++;  // Incrementar el contador al guardar el trabajo
                } catch (error) {
                    console.log(`Error al guardar el trabajo en la base de datos: ${error.message}`);
                }

                await sleep(5000);
            }

            pageNumber++;
        }
    }
})();
