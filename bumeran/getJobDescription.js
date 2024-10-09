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
        await page.waitForSelector('.sc-iDtgLy.eBZPcC', { timeout: 60000 });

        // Obtén el HTML de la página
        const html = await page.content();
        const $ = cheerio.load(html);

        // Inicializa una lista para almacenar los párrafos
        const jobDescriptionParagraphs = [];
        
        // Encuentra el div objetivo
        const targetDiv = $('.sc-iDtgLy.eBZPcC'); // !SUELE CAMBIAR (verificar class)
        
        if (targetDiv.length) {
            // Itera sobre los elementos dentro del targetDiv
            targetDiv.contents().each((index, element) => {
                if (element.tagName === 'p' || element.tagName === 'li' || element.tagName === 'ul' || element.tagName === 'ol') {
                    jobDescriptionParagraphs.push($(element).text().trim());
                }
            });
        }

        // Combina los párrafos en un solo string
        const jobDescription = jobDescriptionParagraphs.join('\n');
        
        // Obtiene todos los elementos <h2> con la clase especificada
        const h2Elements = $('h2.sc-jqsdoX.TcmqW'); // !SUELE CAMBIAR (verificar class)
        // Selecciona el quinto <h2> (ajusta el índice según sea necesario)
        let typeOfJob = h2Elements.eq(4).text().trim().split(',')[0];
        
        // Lista de tipos de trabajo válidos
        const validJobTypes = ['Full-time', 'Part-time', 'Por Horas', 'Pasantia'];
        
        // Verifica si el tipo de trabajo es válido, si no, asigna 'Full-time' por defecto
        if (!validJobTypes.includes(typeOfJob)) {
            typeOfJob = 'Full-time';
        }

        // Formatea los resultados
        const result = {
            type_of_job: typeOfJob.trim(),
            description: jobDescription,
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
// const jobDescriptionHref = 'https://www.bumeran.com.pe/empleos/desarrollador-programador-jr--exp--en--net-y-sql-fiorella-representaciones-1116364403.html';
// getJobDescription(jobDescriptionHref).then(result => console.log(result));
