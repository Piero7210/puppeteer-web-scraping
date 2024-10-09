const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

// Función para obtener la descripción del trabajo
async function getJobDescription(jobDescriptionHref) {
    // Configura las opciones de Chrome
    const chromeOptions = {
        headless: false, // Cambiar a false si deseas ver el navegador en acción
        args: ['--ignore-certificate-errors', '--ignore-ssl-errors', '--incognito']
    };

    // Inicializa el navegador
    const browser = await puppeteer.launch(chromeOptions);
    const page = await browser.newPage();

    try {
        // Navega a la URL de la descripción del empleo
        await page.goto(jobDescriptionHref, { waitUntil: 'networkidle2' });
        // Espera a que un elemento específico esté presente en la página
        await page.waitForSelector('#ficha-detalle', { timeout: 30000 });

        // Obtén el HTML de la página
        const html = await page.content();
        const $ = cheerio.load(html);

        // Inicializa una lista para almacenar los párrafos
        const jobDescriptionParagraphs = [];
        
        // Encuentra el div objetivo
        const targetDiv = $('#ficha-detalle > div:nth-child(2) > div > div:nth-child(1)');
        
        if (targetDiv.length) {
            // Itera sobre los elementos dentro del targetDiv
            targetDiv.contents().each((index, element) => {
                if (element.tagName === 'p' || element.tagName === 'li' || element.tagName === 'ul' || element.tagName === 'ol') {
                    jobDescriptionParagraphs.push($(element).text().trim());
                }
            });
        }
    
        // Obtiene el elemento que contiene el tipo de trabajo
        let typeOfJob = $('#ficha-detalle > div:nth-child(2) > div > div:nth-child(1) > div:nth-child(4) > div > ul > div:nth-child(1) > li:nth-child(3) > h2');
        
        // Lista de tipos de trabajo válidos
        const validJobTypes = ['Full-time', 'Part-time', 'Por Horas', 'Pasantia'];
        
        // Verifica si el tipo de trabajo es válido, si no, asigna 'Full-time' por defecto
        if (!validJobTypes.includes(typeOfJob)) {
            typeOfJob = 'Full-time';
        }

        // Formatea los resultados
        const result = {
            type_of_job: typeOfJob.trim(),
            description: jobDescriptionParagraphs.join('\n'),
        };
        console.log(result);
        console.log('---------------------------------');
              
        return result;

    } catch (error) {
        console.error(`Error al obtener la descripción del empleo: ${error}`);
        return null;

    } finally {
        // Cierra el navegador
        await browser.close();
    }
}

// Exporta la función usando module.exports
module.exports = { getJobDescription };

// Ejemplo de uso
// const jobDescriptionHref = 'https://www.bumeran.com.pe/empleos/analista-de-transformacion-digital-y-procesos-experis-peru-1116503185.html';
// getJobDescription(jobDescriptionHref).then(result => console.log(result));
