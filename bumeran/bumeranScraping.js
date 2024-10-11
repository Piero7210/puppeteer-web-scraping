const puppeteer = require('puppeteer');
const { Sequelize, DataTypes } = require('sequelize');
const cheerio = require('cheerio');
const { getJobDescription } = require('./getJobDescription.js');

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

// Función para convertir texto de fecha a objeto Date
function convertToDate(dateText) {
    const today = new Date();
    dateText = dateText.toLowerCase();
    
    if (dateText.includes('hoy')) {
        return today;
    } else if (dateText.includes('ayer')) {
        return new Date(today.setDate(today.getDate() - 1));
    } else if (dateText.includes('hora')) {
        const hours = parseInt(dateText.match(/\d+/)[0]);
        return new Date(today.setHours(today.getHours() - hours));
    } else if (dateText.includes('día') || dateText.includes('días')) {
        const days = parseInt(dateText.match(/\d+/)[0]);
        return new Date(today.setDate(today.getDate() - days));
    } else {
        return today;
    }
}

// Keywords de búsqueda de empleos
// const keywordsJobs = ['Asistente', 'Practicante', 'Asesor', 'Auxiliar', 'Analista', 'Tecnico', 'Ejecutivo', 'Diseñador', 'Representante', 'Desarrollador', 'Coordinador', 'Soporte', 'Jefe', 'Vendedor', 'Promotor', 'Atencion']
const keywordsJobs = ['Asistente'];

const dateScraped = new Date().toISOString().split('T')[0];

(async () => {
    for (const keyword of keywordsJobs) {
        let pageNumber = 1;

        while (true) {
            // URL de búsqueda de empleos en Bumeran
            const urlBumeran = `https://www.bumeran.com.pe/empleos-publicacion-menor-a-7-dias-busqueda-${keyword}.html?recientes=true&page=${pageNumber}`;

            // Configuración del proxy
            const proxyUrl = 'gw.dataimpulse.com:823';
            const username = '80c437873bbc27d63aa9';
            const password = '60e5506f4a26d525';

            try {
                // Inicializa el navegador
                const browser = await puppeteer.launch({ 
                    headless: false,
                    args: [
                        '--ignore-certificate-errors',
                        '--ignore-ssl-errors',
                        `--proxy-server=${proxyUrl}`, // Agrega el proxy al navegador
                    ],
                 });

                // Crea una nueva página
                const page = await browser.newPage();

                // Autenticación del proxy
                await page.authenticate({
                    username,
                    password
                });

                // Navega a una página que muestra la IP para verificar el proxy
                // await page.goto('https://api.ipify.org');
                // const ipAddress = await page.evaluate(() => document.body.textContent);
                // console.log(`Current IP Address: ${ipAddress}`);

                // Navega a la URL de Bumeran
                await page.goto(urlBumeran);

                // Espera a que un elemento específico esté presente en la página
                await page.waitForSelector('#listado-avisos');

                // Obtener el contenido de la página
                const content = await page.content();
                const $ = cheerio.load(content);

                // Inicializa una lista para almacenar los datos de los trabajos
                const jobsData = [];
                
                const companyElements = [];
                const titleElements = [];
                const locationElements = [];
                const dateElements = [];
                const link_url = [];

                for (let i = 1; i <= 20; i++) {
                    let company= $(`#listado-avisos > div:nth-of-type(${i}) > a > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > div > span > h3`)
                    .filter((i, el) => $(el).text().trim() !== '-'); // Filtra los elementos que no contienen '-'
                    
                    let title = $(`#listado-avisos > div:nth-of-type(${i}) > a > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > span > h3`);
                    
                    let location = $(`#listado-avisos > div:nth-of-type(${i}) > a > div > div:nth-of-type(2) > div > div:nth-of-type(1) > span > h3`)
                    .filter((index) => index % 2 === 0); // Filtra los elementos pares
                    
                    let date = $(`#listado-avisos > div:nth-of-type(${i}) > a > div > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div > div > div > div > h3`);
                    
                    let link = $(`#listado-avisos > div:nth-of-type(${i}) > a`); 
                    
                    // Verifica si hay más trabajos en la página
                    if (!company.length || !title.length || !location.length || !date.length) {
                        console.log("No more jobs found, ending pagination.");
                        break;
                    }
                    
                    // Si se encontraron elementos, los agrega a las listas
                    companyElements.push(company);
                    titleElements.push(title);
                    locationElements.push(location)
                    dateElements.push(date);
                    link_url.push(link);
                }

                console.log(`Number of companies: ${companyElements.length}`);
                console.log(`Number of titles: ${titleElements.length}`);
                console.log(`Number of locations: ${locationElements.length}`);
                console.log(`Number of dates: ${dateElements.length}`);

                // Verifica si hay más trabajos en la página
                if (!companyElements.length || !titleElements.length || !locationElements.length || !dateElements.length) {
                    console.log("No more jobs found, ending pagination.");
                    break;
                }

                // Itera sobre los elementos y extrae los datos
                for (let i = 0; i < Math.min(companyElements.length, titleElements.length, locationElements.length, dateElements.length); i++) {
                    try {
                        const companyTitle = $(companyElements[i]).text().trim();
                        const jobTitle = $(titleElements[i]).text().trim();
                        const jobLocation = $(locationElements[i]).text().trim();
                        const jobDateText = $(dateElements[i]).text().trim();
                        const jobDate = convertToDate(jobDateText);
                        const jobDescriptionHref = $(link_url[i]).attr('href');
                        const jobDescriptionLink = `https://www.bumeran.com.pe${jobDescriptionHref}`;
                        
                        // Datos del trabajo
                        const jobData = {
                            company: companyTitle,
                            title: jobTitle,
                            location: jobLocation,
                            date: jobDate,
                            platform: 'Bumeran',
                            link_url: jobDescriptionLink,
                            date_scraped: dateScraped
                        };

                        // Obtiene la descripción del empleo
                        const descriptionResult = await getJobDescription(jobDescriptionLink);
                        if (!descriptionResult || typeof descriptionResult !== 'object') {
                            console.log(`Error al obtener la descripción del empleo desde ${jobDescriptionHref}`);
                            continue;
                        }

                        // Combina los datos del trabajo y la descripción
                        const resultDict = { ...jobData, ...descriptionResult };
                        jobsData.push(resultDict);
                    } catch (error) {
                        console.error(`Se produjo un error en el bucle: ${error}`);
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
                            date_scraped: job.date_scraped
                        });
                    }
                } catch (error) {
                    console.error(`Error occurred during commit: ${error}`);
                }

                await browser.close();
                // Incrementa el número de página
                pageNumber += 1;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Espera a que la nueva página se cargue completamente

            } catch (error) {
                console.error(`Se produjo un error: ${error}`);
                break;
            }
        }
    }
})();
