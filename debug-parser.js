
const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('FEU LA MERE DE MADAME.pdf');

pdf(dataBuffer).then(function (data) {
    console.log("--- START TEXT DUMP (First 2000 chars) ---");
    console.log(data.text.substring(0, 2000));
    console.log("--- END TEXT DUMP ---");
});
